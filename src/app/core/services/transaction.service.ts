import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { lastValueFrom, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  Transaction, TransactionForm, TransactionFilter,
  TransactionCategory, CATEGORY_LABELS,
} from '../models/transaction.model';
import { ApiResponse } from '../models/user.model';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

const API = environment.apiUrl;

interface FinancialRecordDto {
  financialRecordId?: number;
  userDocumentNumber?: string;
  recordType?: string;
  category?: string;
  description?: string;
  amount?: number;
  recordDate?: string;
  recurring?: boolean;
  periodicity?: string;
}

function toTransaction(dto: FinancialRecordDto): Transaction {
  const categoryKey = (Object.entries(CATEGORY_LABELS).find(
    ([, label]) => label.toLowerCase() === (dto.category ?? '').toLowerCase()
  )?.[0] as TransactionCategory) ?? 'other';

  return {
    id: String(dto.financialRecordId),
    type: dto.recordType === 'INCOME' ? 'income' : 'expense',
    amount: dto.amount ?? 0,
    date: dto.recordDate ?? '',
    category: categoryKey,
    description: dto.description,
    createdAt: dto.recordDate ?? '',
  };
}

@Injectable({ providedIn: 'root' })
export class TransactionService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

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

  async loadAll(): Promise<void> {
    this._loading.set(true);
    try {
      const res = await lastValueFrom(
        this.http.get<ApiResponse<FinancialRecordDto[]>>(
          `${API}/financial-records/users/${this.documentNumber}`
        ).pipe(catchError((err: HttpErrorResponse) => this.handleError(err)))
      );
      this._transactions.set((res.data ?? []).map(toTransaction));
    } finally {
      this._loading.set(false);
    }
  }

  async add(form: TransactionForm): Promise<void> {
    const endpoint = form.type === 'income' ? 'incomes' : 'expenses';
    const body: FinancialRecordDto = {
      userDocumentNumber: this.documentNumber,
      category: CATEGORY_LABELS[form.category as TransactionCategory] ?? form.category,
      description: form.description || undefined,
      amount: form.amount!,
      recordDate: form.date,
      recurring: false,
    };
    const res = await lastValueFrom(
      this.http.post<ApiResponse<FinancialRecordDto>>(
        `${API}/financial-records/${endpoint}`, body
      ).pipe(catchError((err: HttpErrorResponse) => this.handleError(err)))
    );
    this._transactions.update(list => [toTransaction(res.data), ...list]);
  }

  async update(id: string, form: TransactionForm): Promise<void> {
    const body: FinancialRecordDto = {
      userDocumentNumber: this.documentNumber,
      recordType: form.type === 'income' ? 'INCOME' : 'EXPENSE',
      category: CATEGORY_LABELS[form.category as TransactionCategory] ?? form.category,
      description: form.description || undefined,
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
      list.map(t => t.id === id ? toTransaction(res.data) : t)
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
      if (filters.category !== 'all' && t.category !== filters.category) return false;
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
      if (!map.has(t.category)) {
        map.set(t.category, { label: CATEGORY_LABELS[t.category], amount: 0, type: t.type });
      }
      map.get(t.category)!.amount += t.amount;
    });
    return Array.from(map.entries())
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.amount - a.amount);
  }
}
