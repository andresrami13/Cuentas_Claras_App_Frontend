import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { lastValueFrom, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  BudgetCycle, BudgetCategory, UserBudgetConfig,
  CreateCycleForm, AddCategoryForm,
} from '../models/budget.model';
import { ApiResponse } from '../models/user.model';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

const API = environment.apiUrl;

interface BudgetCycleDto {
  cycleId?: number | string;
  userDocumentNumber?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  categories?: BudgetCategoryDto[];
}

interface BudgetCategoryDto {
  categoryId?: number | string;
  categoryName?: string;
  assignedAmount?: number;
  spentAmount?: number;
}

interface UserBudgetConfigDto {
  configId?: number | string;
  userDocumentNumber?: string;
  payDay?: number;
  nextPayDate?: string;
  fixedCategories?: { categoryName?: string; amount?: number }[];
}

function toCategory(dto: BudgetCategoryDto): BudgetCategory {
  const assigned = dto.assignedAmount ?? 0;
  const spent = dto.spentAmount ?? 0;
  return {
    id: String(dto.categoryId ?? ''),
    name: dto.categoryName ?? '',
    assigned,
    spent,
    available: assigned - spent,
  };
}

function toCycle(dto: BudgetCycleDto): BudgetCycle {
  return {
    id: String(dto.cycleId ?? ''),
    documentNumber: dto.userDocumentNumber ?? '',
    startDate: dto.startDate ?? '',
    endDate: dto.endDate ?? '',
    status: dto.status === 'ACTIVE' ? 'active' : 'closed',
    categories: (dto.categories ?? []).map(toCategory),
  };
}

function toConfig(dto: UserBudgetConfigDto): UserBudgetConfig {
  return {
    documentNumber: dto.userDocumentNumber ?? '',
    payDay: dto.payDay ?? 1,
    nextPayDate: dto.nextPayDate ?? '',
    fixedCategories: (dto.fixedCategories ?? []).map(fc => ({
      name: fc.categoryName ?? '',
      amount: fc.amount ?? 0,
    })),
  };
}

@Injectable({ providedIn: 'root' })
export class BudgetService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  private readonly _cycle = signal<BudgetCycle | null>(null);
  private readonly _config = signal<UserBudgetConfig | null>(null);
  private readonly _loading = signal(false);

  readonly cycle = this._cycle.asReadonly();
  readonly config = this._config.asReadonly();
  readonly loading = this._loading.asReadonly();

  readonly totalAssigned = computed(() =>
    (this._cycle()?.categories ?? []).reduce((s, c) => s + c.assigned, 0)
  );

  readonly totalSpent = computed(() =>
    (this._cycle()?.categories ?? []).reduce((s, c) => s + c.spent, 0)
  );

  readonly totalAvailable = computed(() => this.totalAssigned() - this.totalSpent());

  private get documentNumber(): string {
    return this.auth.user()?.documentNumber ?? '';
  }

  private handleError(err: HttpErrorResponse) {
    const msg = err.error?.message || 'Error inesperado, intenta de nuevo';
    return throwError(() => new Error(msg));
  }

  async loadActiveCycle(): Promise<void> {
    this._loading.set(true);
    try {
      const res = await lastValueFrom(
        this.http.get<ApiResponse<BudgetCycleDto>>(
          `${API}/budget-cycles/users/${this.documentNumber}/active`
        )
      );
      this._cycle.set(toCycle(res.data));
    } catch {
      this._cycle.set(null);
    } finally {
      this._loading.set(false);
    }
  }

  async createCycle(form: CreateCycleForm): Promise<void> {
    const body: BudgetCycleDto = {
      userDocumentNumber: this.documentNumber,
      startDate: form.startDate,
      endDate: form.endDate,
      status: 'ACTIVE',
    };
    const res = await lastValueFrom(
      this.http.post<ApiResponse<BudgetCycleDto>>(`${API}/budget-cycles`, body)
        .pipe(catchError((err: HttpErrorResponse) => this.handleError(err)))
    );
    this._cycle.set(toCycle(res.data));
  }

  async addCategory(form: AddCategoryForm): Promise<void> {
    const cycleId = this._cycle()?.id;
    if (!cycleId) return;
    const body: BudgetCategoryDto = {
      categoryName: form.name,
      assignedAmount: form.assigned!,
    };
    const res = await lastValueFrom(
      this.http.post<ApiResponse<BudgetCategoryDto>>(
        `${API}/budget-cycles/${cycleId}/categories`, body
      ).pipe(catchError((err: HttpErrorResponse) => this.handleError(err)))
    );
    const newCat = toCategory(res.data);
    this._cycle.update(c => c ? { ...c, categories: [...c.categories, newCat] } : c);
  }

  async updateCategory(categoryId: string, form: AddCategoryForm): Promise<void> {
    const cycleId = this._cycle()?.id;
    if (!cycleId) return;
    const body: BudgetCategoryDto = {
      categoryName: form.name,
      assignedAmount: form.assigned!,
    };
    const res = await lastValueFrom(
      this.http.put<ApiResponse<BudgetCategoryDto>>(
        `${API}/budget-cycles/${cycleId}/categories/${categoryId}`, body
      ).pipe(catchError((err: HttpErrorResponse) => this.handleError(err)))
    );
    const updated = toCategory(res.data);
    this._cycle.update(c => c ? {
      ...c,
      categories: c.categories.map(cat => cat.id === categoryId ? updated : cat),
    } : c);
  }

  async loadConfig(): Promise<void> {
    try {
      const res = await lastValueFrom(
        this.http.get<ApiResponse<UserBudgetConfigDto>>(
          `${API}/user-budget-config/${this.documentNumber}`
        )
      );
      this._config.set(toConfig(res.data));
    } catch {
      this._config.set(null);
    }
  }

  async saveConfig(data: UserBudgetConfig): Promise<void> {
    const body: UserBudgetConfigDto = {
      userDocumentNumber: this.documentNumber,
      payDay: data.payDay,
      nextPayDate: data.nextPayDate,
      fixedCategories: data.fixedCategories.map(fc => ({
        categoryName: fc.name,
        amount: fc.amount,
      })),
    };
    const res = await lastValueFrom(
      this.http.post<ApiResponse<UserBudgetConfigDto>>(`${API}/user-budget-config`, body)
        .pipe(catchError((err: HttpErrorResponse) => this.handleError(err)))
    );
    this._config.set(toConfig(res.data));
  }
}
