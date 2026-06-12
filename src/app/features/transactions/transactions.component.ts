import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { AmountInputDirective } from '../../shared/directives/amount-input.directive';
import { FeatureGuideComponent } from '../../shared/components/feature-guide/feature-guide.component';
import { TransactionService } from '../../core/services/transaction.service';
import { BudgetService } from '../../core/services/budget.service';
import { AuthService } from '../../core/services/auth.service';
import { BudgetCategory } from '../../core/models/budget.model';
import {
  Transaction, TransactionForm, TransactionFilter, INCOME_TYPES,
} from '../../core/models/transaction.model';

const EMPTY_FORM: TransactionForm = {
  type: 'expense',
  amount: null,
  date: new Date().toISOString().split('T')[0],
  budgetCategoryId: null,
  incomeType: '',
  description: '',
};

const EMPTY_FILTER: TransactionFilter = {
  type: 'all',
  budgetCategoryId: 'all',
  dateFrom: '',
  dateTo: '',
};

@Component({
  selector: 'app-transactions',
  imports: [FormsModule, DatePipe, AmountInputDirective, FeatureGuideComponent],
  templateUrl: './transactions.component.html',
})
export class TransactionsComponent implements OnInit {
  private txService = inject(TransactionService);
  private authService = inject(AuthService);
  private budgetService = inject(BudgetService);

  readonly user = this.authService.user;
  readonly loading = this.txService.loading;
  readonly totalIncome = this.txService.totalIncome;
  readonly totalExpenses = this.txService.totalExpenses;
  readonly balance = this.txService.balance;

  readonly INCOME_TYPES = INCOME_TYPES;

  readonly guideSteps = [
    'Registra un ingreso cada vez que te llegue plata: tu sueldo, un pago extra, un regalo...',
    'Registra un gasto eligiendo a qué categoría del presupuesto pertenece: así se descuenta automáticamente de ese sobre.',
    'Usa los filtros para buscar movimientos por tipo, categoría o rango de fechas.',
    'Las tarjetas de arriba resumen todo: el balance es ingresos menos gastos. Si está positivo, gastaste menos de lo que recibiste.',
  ];

  filter: TransactionFilter = { ...EMPTY_FILTER };
  showFilters = signal(false);

  get filteredTransactions(): Transaction[] {
    return this.txService.filter(this.filter);
  }

  get budgetCategories(): BudgetCategory[] {
    return this.budgetService.cycle()?.categories ?? [];
  }

  showForm = signal(false);
  editingId = signal<string | null>(null);
  form: TransactionForm = { ...EMPTY_FORM };
  formLoading = signal(false);
  formError = signal<string | null>(null);
  deleteConfirmId = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    await this.budgetService.loadActiveCycle();
    await this.txService.loadAll();
  }

  openAddForm(): void {
    this.editingId.set(null);
    this.form = { ...EMPTY_FORM, date: new Date().toISOString().split('T')[0] };
    this.showForm.set(true);
  }

  openEditForm(tx: Transaction): void {
    this.editingId.set(tx.id);
    this.form = {
      type: tx.type,
      amount: tx.amount,
      date: tx.date,
      budgetCategoryId: tx.budgetCategoryId,
      incomeType: tx.type === 'income' ? (tx.categoryName ?? '') : '',
      description: tx.type === 'expense' ? (tx.description ?? '') : '',
    };
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingId.set(null);
    this.formError.set(null);
  }

  async saveForm(): Promise<void> {
    const isExpense = this.form.type === 'expense';
    if (!this.form.amount || !this.form.date) return;
    if (isExpense && !this.form.budgetCategoryId) return;
    if (!isExpense && !this.form.incomeType) return;

    this.formLoading.set(true);
    this.formError.set(null);
    try {
      const id = this.editingId();
      if (id) {
        await this.txService.update(id, this.form);
      } else {
        await this.txService.add(this.form);
      }
      this.closeForm();
    } catch (err: unknown) {
      this.formError.set(err instanceof Error ? err.message : 'Error al guardar el movimiento');
    } finally {
      this.formLoading.set(false);
    }
  }

  confirmDelete(id: string): void {
    this.deleteConfirmId.set(id);
  }

  cancelDelete(): void {
    this.deleteConfirmId.set(null);
  }

  async doDelete(): Promise<void> {
    const id = this.deleteConfirmId();
    if (id) {
      await this.txService.delete(id);
      this.deleteConfirmId.set(null);
    }
  }

  resetFilters(): void {
    this.filter = { ...EMPTY_FILTER };
  }

  onTypeChange(): void {
    this.form.budgetCategoryId = null;
    this.form.incomeType = '';
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount);
  }

  formatCompact(amount: number): string {
    const abs = Math.abs(amount);
    const prefix = amount < 0 ? '-$' : '$';
    if (abs >= 1_000_000) {
      const v = (abs / 1_000_000).toFixed(1).replace(/\.0$/, '');
      return `${prefix}${v}M`;
    }
    if (abs >= 1_000) {
      const v = (abs / 1_000).toFixed(1).replace(/\.0$/, '');
      return `${prefix}${v}K`;
    }
    return `${prefix}${abs.toFixed(0)}`;
  }

  getFirstName(): string {
    const name = this.user()?.name ?? '';
    return name.split(' ')[0];
  }
}
