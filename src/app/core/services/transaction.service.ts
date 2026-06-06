import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { lastValueFrom, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Transaction, TransactionForm, TransactionFilter } from '../models/transaction.model';
import { ApiResponse } from '../models/user.model';
import { AuthService } from './auth.service';
import { BudgetService } from './budget.service';
import { environment } from '../../../environments/environment';

const API = environment.apiUrl;

interface FinancialRecordDto {
  financialRecordId?: number;
  userDocumentNumber?: string;
  recordType?: string;
  budgetCategoryId?: number;
  description?: string;
  amount?: number;
  recordDate?: string;
  recurring?: boolean;
  periodicity?: string;
}

@Injectable({ providedIn: 'root' })
export class TransactionService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly budgetSvc = inject(BudgetService);

  private readonly _transactions = signal<Transaction[]>([]);
  private readonly _loading = signal(false);

  readonly transactions = this._transactions.asReadonly();
  readonly loading = this._loading.asReadonly();

  readonly totalIncome = computed(() =>
    this._transactions().filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  );

  readonly totalExpenses = computed(() =>
    this._transactions().filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  );

  readonly balance = computed(() => this.totalIncome() - this.totalExpenses());

  private get documentNumber(): string {
    return this.auth.user()?.documentNumber ?? '';
  }

  private handleError(err: HttpErrorResponse) {
    const msg = err.error?.message || 'Error inesperado, intenta de nuevo';
    return throwError(() => new Error(msg));
  }

  private toTransaction(dto: FinancialRecordDto): Transaction {
    const isIncome = dto.recordType === 'INCOME';
    const categories = this.budgetSvc.cycle()?.categories ?? [];
    const budgetCategory = categories.find(c => Number(c.id) === dto.budgetCategoryId);

    return {
      id: String(dto.financialRecordId),
      type: isIncome ? 'income' : 'expense',
      amount: dto.amount ?? 0,
      date: dto.recordDate ?? '',
      budgetCategoryId: dto.budgetCategoryId ?? null,
      categoryName: isIncome
        ? (dto.description ?? 'Ingreso')
        : (budgetCategory?.name ?? 'Sin categoría'),
      description: isIncome ? undefined : (dto.description || undefined),
      createdAt: dto.recordDate ?? '',
    };
  }

  async loadAll(): Promise<void> {
    this._loading.set(true);
    try {
      const res = await lastValueFrom(
        this.http.get<ApiResponse<FinancialRecordDto[]>>(
          `${API}/financial-records/users/${this.documentNumber}`
        ).pipe(catchError((err: HttpErrorResponse) => this.handleError(err)))
      );
      this._transactions.set((res.data ?? []).map(dto => this.toTransaction(dto)));
    } finally {
      this._loading.set(false);
    }
  }

  async add(form: TransactionForm): Promise<void> {
    const isExpense = form.type === 'expense';
    const endpoint = isExpense ? 'expenses' : 'incomes';
    const body: FinancialRecordDto = {
      userDocumentNumber: this.documentNumber,
      budgetCategoryId: isExpense ? form.budgetCategoryId! : undefined,
      description: isExpense ? (form.description || undefined) : form.incomeType,
      amount: form.amount!,
      recordDate: form.date,
      recurring: false,
    };
    const res = await lastValueFrom(
      this.http.post<ApiResponse<FinancialRecordDto>>(
        `${API}/financial-records/${endpoint}`, body
      ).pipe(catchError((err: HttpErrorResponse) => this.handleError(err)))
    );
    this._transactions.update(list => [this.toTransaction(res.data), ...list]);
  }

  async update(id: string, form: TransactionForm): Promise<void> {
    const isExpense = form.type === 'expense';
    const body: FinancialRecordDto = {
      userDocumentNumber: this.documentNumber,
      recordType: isExpense ? 'EXPENSE' : 'INCOME',
      budgetCategoryId: isExpense ? form.budgetCategoryId! : undefined,
      description: isExpense ? (form.description || undefined) : form.incomeType,
      amount: form.amount!,
      recordDate: form.date,
      recurring: false,
    };
    const res = await lastValueFrom(
      this.http.put<ApiResponse<FinancialRecordDto>>(
        `${API}/financial-records/${id}`, body
      ).pipe(catchError((err: HttpErrorResponse) => this.handleError(err)))
    );
    this._transactions.update(list =>
      list.map(t => t.id === id ? this.toTransaction(res.data) : t)
    );
  }

  async delete(id: string): Promise<void> {
    await lastValueFrom(
      this.http.delete<ApiResponse<void>>(`${API}/financial-records/${id}`)
        .pipe(catchError((err: HttpErrorResponse) => this.handleError(err)))
    );
    this._transactions.update(list => list.filter(t => t.id !== id));
  }

  filter(filters: TransactionFilter): Transaction[] {
    return this._transactions().filter(t => {
      if (filters.type !== 'all' && t.type !== filters.type) return false;
      if (filters.budgetCategoryId !== 'all' && t.budgetCategoryId !== filters.budgetCategoryId) return false;
      if (filters.dateFrom && t.date < filters.dateFrom) return false;
      if (filters.dateTo && t.date > filters.dateTo) return false;
      return true;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }

  getByMonth(): { month: string; income: number; expenses: number }[] {
    const map = new Map<string, { income: number; expenses: number }>();
    this._transactions().forEach(t => {
      const month = t.date.substring(0, 7);
      if (!map.has(month)) map.set(month, { income: 0, expenses: 0 });
      const entry = map.get(month)!;
      if (t.type === 'income') entry.income += t.amount;
      else entry.expenses += t.amount;
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({ month, ...data }));
  }

  getByCategory(): { category: string; label: string; amount: number; type: string }[] {
    const map = new Map<string, { label: string; amount: number; type: string }>();
    this._transactions().forEach(t => {
      const key = t.categoryName;
      if (!map.has(key)) {
        map.set(key, { label: t.categoryName, amount: 0, type: t.type });
      }
      map.get(key)!.amount += t.amount;
    });
    return Array.from(map.entries())
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.amount - a.amount);
  }
}
