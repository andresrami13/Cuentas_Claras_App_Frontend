import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { lastValueFrom, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  BudgetCycle, BudgetCategory, UserBudgetConfig,
  CreateCycleForm, AddCategoryForm, Periodicity,
} from '../models/budget.model';
import { ApiResponse } from '../models/user.model';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

const API = environment.apiUrl;

interface BudgetCycleDto {
  id?: number;
  userDocumentNumber?: string;
  startDate?: string;
  endDate?: string;
  paymentDay?: number;
  periodicity?: string;
  status?: string;
  categories?: BudgetCategoryDto[];
}

interface BudgetCategoryDto {
  id?: number;
  cycleId?: number;
  categoryName?: string;
  assignedAmount?: number;
  spentAmount?: number;
  availableAmount?: number;
}

interface FixedBudgetCategoryDto {
  id?: number;
  categoryName?: string;
  amount?: number;
}

interface UserBudgetConfigDto {
  id?: number;
  userDocumentNumber?: string;
  paymentDay?: number;
  periodicity?: string;
  nextPaymentDate?: string;
  fixedCategories?: FixedBudgetCategoryDto[];
}

// ── Date helper ───────────────────────────────────────────────────────────────

function calcNextPayDate(payDay: number, cycleStartDate: string): string {
  const start = new Date(cycleStartDate + 'T00:00:00');
  const nextYear = start.getMonth() === 11 ? start.getFullYear() + 1 : start.getFullYear();
  const nextMonth = (start.getMonth() + 1) % 12;
  const lastDay = new Date(nextYear, nextMonth + 1, 0).getDate();
  const day = Math.min(payDay, lastDay);
  return `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// ─────────────────────────────────────────────────────────────────────────────

function toCategory(dto: BudgetCategoryDto): BudgetCategory {
  const assigned = dto.assignedAmount ?? 0;
  const spent = dto.spentAmount ?? 0;
  return {
    id: String(dto.id ?? ''),
    name: dto.categoryName ?? '',
    assigned,
    spent,
    available: dto.availableAmount ?? (assigned - spent),
  };
}

function toCycle(dto: BudgetCycleDto): BudgetCycle {
  return {
    id: String(dto.id ?? ''),
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
    payDay: dto.paymentDay ?? 1,
    periodicity: (dto.periodicity as Periodicity) ?? 'MONTHLY',
    nextPayDate: dto.nextPaymentDate ?? '',
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

  // Suma el disponible de cada categoría, contando solo lo positivo: una
  // categoría sobregirada (disponible negativo) aporta 0, no resta del total.
  // Así coincide con sumar a mano los "disponible" verdes que se muestran.
  readonly totalAvailable = computed(() =>
    (this._cycle()?.categories ?? []).reduce((s, c) => s + Math.max(0, c.available), 0)
  );

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
    const body = {
      userDocumentNumber: this.documentNumber,
      paymentDay: form.paymentDay,
      periodicity: form.periodicity,
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

  async deleteCategory(categoryId: string): Promise<void> {
    const cycleId = this._cycle()?.id;
    if (!cycleId) return;
    await lastValueFrom(
      this.http.delete<ApiResponse<null>>(
        `${API}/budget-cycles/${cycleId}/categories/${categoryId}`
      ).pipe(catchError((err: HttpErrorResponse) => this.handleError(err)))
    );
    this._cycle.update(c => c ? {
      ...c,
      categories: c.categories.filter(cat => cat.id !== categoryId),
    } : c);
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

  async autoCreateCycle(): Promise<void> {
    const config = this._config();
    if (!config) throw new Error('No hay configuración de presupuesto');

    this._loading.set(true);
    try {
      await this.createCycle({ paymentDay: config.payDay, periodicity: config.periodicity });

      for (const fc of config.fixedCategories) {
        await this.addCategory({ name: fc.name, assigned: fc.amount });
      }

      const cycleStart = this._cycle()?.startDate;
      if (cycleStart) {
        const newNextPayDate = calcNextPayDate(config.payDay, cycleStart);
        await this.saveConfig({ ...config, nextPayDate: newNextPayDate });
      }
    } finally {
      this._loading.set(false);
    }
  }

  async syncCycleWithConfig(): Promise<void> {
    const config = this._config();
    const cycle = this._cycle();
    if (!config || !cycle || config.fixedCategories.length === 0) return;

    for (const fc of config.fixedCategories) {
      const existing = cycle.categories.find(c => c.name === fc.name);
      if (existing) {
        await this.updateCategory(existing.id, { name: fc.name, assigned: fc.amount });
      } else {
        await this.addCategory({ name: fc.name, assigned: fc.amount });
      }
    }
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
      paymentDay: data.payDay,
      periodicity: data.periodicity,
      nextPaymentDate: data.nextPayDate,
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
