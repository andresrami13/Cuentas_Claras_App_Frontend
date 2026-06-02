import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { lastValueFrom, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { FinancialGoal } from '../models/goal.model';
import { ApiResponse } from '../models/user.model';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

const API = environment.apiUrl;

export interface GoalForm {
  name: string;
  description: string;
  targetAmount: number | null;
  currentAmount: number | null;
  startDate: string;
  targetDate: string;
  status: string;
}

interface FinancialGoalDto {
  financialGoalId: number;
  userDocumentNumber: string;
  name: string;
  description?: string;
  targetAmount: number;
  currentAmount: number;
  startDate: string;
  targetDate: string;
  status: string;
}

function toGoal(dto: FinancialGoalDto): FinancialGoal {
  return {
    id: String(dto.financialGoalId),
    name: dto.name,
    targetAmount: dto.targetAmount,
    currentAmount: dto.currentAmount,
    startDate: dto.startDate,
    deadline: dto.targetDate,
    status: dto.status,
    description: dto.description,
  };
}

@Injectable({ providedIn: 'root' })
export class GoalService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  private readonly _goals = signal<FinancialGoal[]>([]);
  readonly loading = signal(false);

  readonly goals = this._goals.asReadonly();
  readonly activeGoal = computed(() => this._goals().find(g => g.status === 'ACTIVE') ?? null);

  private get documentNumber(): string {
    return this.auth.user()?.documentNumber ?? '';
  }

  private handleError(err: HttpErrorResponse) {
    const msg = err.error?.message || 'Error inesperado, intenta de nuevo';
    return throwError(() => new Error(msg));
  }

  async loadAll(): Promise<void> {
    this.loading.set(true);
    try {
      const res = await lastValueFrom(
        this.http.get<ApiResponse<FinancialGoalDto[]>>(
          `${API}/financial-goals/users/${this.documentNumber}`
        ).pipe(catchError((err: HttpErrorResponse) => this.handleError(err)))
      );
      this._goals.set((res.data ?? []).map(toGoal));
    } finally {
      this.loading.set(false);
    }
  }

  async create(form: GoalForm): Promise<void> {
    const body = {
      userDocumentNumber: this.documentNumber,
      name: form.name,
      description: form.description || undefined,
      targetAmount: form.targetAmount!,
      currentAmount: form.currentAmount ?? 0,
      startDate: form.startDate,
      targetDate: form.targetDate,
      status: form.status,
    };
    const res = await lastValueFrom(
      this.http.post<ApiResponse<FinancialGoalDto>>(
        `${API}/financial-goals`, body
      ).pipe(catchError((err: HttpErrorResponse) => this.handleError(err)))
    );
    this._goals.update(list => [...list, toGoal(res.data)]);
  }

  async update(id: string, form: GoalForm): Promise<void> {
    const body = {
      userDocumentNumber: this.documentNumber,
      name: form.name,
      description: form.description || undefined,
      targetAmount: form.targetAmount!,
      currentAmount: form.currentAmount ?? 0,
      startDate: form.startDate,
      targetDate: form.targetDate,
      status: form.status,
    };
    const res = await lastValueFrom(
      this.http.put<ApiResponse<FinancialGoalDto>>(
        `${API}/financial-goals/${id}`, body
      ).pipe(catchError((err: HttpErrorResponse) => this.handleError(err)))
    );
    this._goals.update(list => list.map(g => g.id === id ? toGoal(res.data) : g));
  }

  async delete(id: string): Promise<void> {
    await lastValueFrom(
      this.http.delete<ApiResponse<void>>(
        `${API}/financial-goals/${id}`
      ).pipe(catchError((err: HttpErrorResponse) => this.handleError(err)))
    );
    this._goals.update(list => list.filter(g => g.id !== id));
  }
}
