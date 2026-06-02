import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { lastValueFrom, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AiMessage, FinancialGoal } from '../models/goal.model';
import { ApiResponse } from '../models/user.model';
import { AuthService } from './auth.service';
import { GoalService } from './goal.service';
import { environment } from '../../../environments/environment';

const API = environment.apiUrl;

interface AiCoachRequestDto {
  aiCoachRequestId: number;
  userDocumentNumber: string;
  financialGoalId: number;
  question: string;
  aiResponse: string;
  model?: string;
  createdAt?: string;
}

@Injectable({ providedIn: 'root' })
export class CoachService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly goalService = inject(GoalService);

  private readonly _allMessages = signal<AiMessage[]>([]);
  readonly selectedGoal = signal<FinancialGoal | null>(null);
  readonly isLoading = signal(false);
  readonly initializing = signal(false);

  readonly filteredMessages = computed(() => {
    const goal = this.selectedGoal();
    if (!goal) return [];
    return this._allMessages().filter(m => m.goalId === goal.id);
  });

  private get documentNumber(): string {
    return this.auth.user()?.documentNumber ?? '';
  }

  private handleError(err: HttpErrorResponse) {
    const msg = err.error?.message || 'Error inesperado, intenta de nuevo';
    return throwError(() => new Error(msg));
  }

  selectGoal(goal: FinancialGoal): void {
    this.selectedGoal.set(goal);
  }

  async init(): Promise<void> {
    this.initializing.set(true);
    try {
      await Promise.all([this.goalService.loadAll(), this.loadHistory()]);
    } finally {
      this.initializing.set(false);
    }
  }

  private async loadHistory(): Promise<void> {
    const res = await lastValueFrom(
      this.http.get<ApiResponse<AiCoachRequestDto[]>>(
        `${API}/ai-coach/users/${this.documentNumber}/requests`
      ).pipe(catchError((err: HttpErrorResponse) => this.handleError(err)))
    );
    const msgs: AiMessage[] = [];
    for (const req of (res.data ?? []).sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''))) {
      const goalId = String(req.financialGoalId);
      if (req.question) {
        msgs.push({
          id: `q-${req.aiCoachRequestId}`,
          role: 'user',
          content: req.question,
          timestamp: req.createdAt ?? new Date().toISOString(),
          goalId,
        });
      }
      if (req.aiResponse) {
        msgs.push({
          id: `a-${req.aiCoachRequestId}`,
          role: 'assistant',
          content: req.aiResponse,
          timestamp: req.createdAt ?? new Date().toISOString(),
          goalId,
        });
      }
    }
    this._allMessages.set(msgs);
  }

  async requestAdvice(question: string): Promise<void> {
    const goal = this.selectedGoal();
    if (!goal) return;

    const tempId = Date.now().toString();
    const goalId = goal.id;
    this._allMessages.update(msgs => [
      ...msgs,
      { id: `q-${tempId}`, role: 'user', content: question, timestamp: new Date().toISOString(), goalId },
      { id: `a-${tempId}`, role: 'assistant', content: '', timestamp: new Date().toISOString(), goalId, isLoading: true },
    ]);
    this.isLoading.set(true);

    try {
      const res = await lastValueFrom(
        this.http.post<ApiResponse<AiCoachRequestDto>>(`${API}/ai-coach/advice`, {
          userDocumentNumber: this.documentNumber,
          financialGoalId: Number(goal.id),
          question,
        }).pipe(catchError((err: HttpErrorResponse) => this.handleError(err)))
      );
      this._allMessages.update(msgs =>
        msgs.map(m =>
          m.id === `a-${tempId}`
            ? { ...m, content: res.data.aiResponse, isLoading: false }
            : m
        )
      );
    } catch (err) {
      this._allMessages.update(msgs =>
        msgs.filter(m => m.id !== `q-${tempId}` && m.id !== `a-${tempId}`)
      );
      throw err;
    } finally {
      this.isLoading.set(false);
    }
  }
}
