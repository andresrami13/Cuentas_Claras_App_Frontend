import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { AmountInputDirective } from '../../shared/directives/amount-input.directive';
import { FeatureGuideComponent } from '../../shared/components/feature-guide/feature-guide.component';
import { FabMenuComponent, FabAction } from '../../shared/components/fab-menu/fab-menu.component';
import { TransactionService } from '../../core/services/transaction.service';
import { BudgetService } from '../../core/services/budget.service';
import { AccountService } from '../../core/services/account.service';
import { AuthService } from '../../core/services/auth.service';
import { BudgetCategory } from '../../core/models/budget.model';
import {
  Transaction, TransactionForm, TransactionFilter, INCOME_TYPES,
} from '../../core/models/transaction.model';
import {
  Account, AccountForm, AccountType, ACCOUNT_PRESETS, AccountPreset,
  ACCOUNT_COLORS, ACCOUNT_TYPE_ICONS, ACCOUNT_TYPE_LABELS,
} from '../../core/models/account.model';

const EMPTY_FORM: TransactionForm = {
  type: 'expense',
  amount: null,
  date: new Date().toISOString().split('T')[0],
  budgetCategoryId: null,
  accountId: null,
  incomeType: '',
  description: '',
};

const EMPTY_FILTER: TransactionFilter = {
  type: 'all',
  budgetCategoryId: 'all',
  accountId: 'all',
  dateFrom: '',
  dateTo: '',
};

const EMPTY_ACCOUNT_FORM: AccountForm = {
  name: '',
  type: 'BANK',
  provider: null,
  initialBalance: null,
  color: ACCOUNT_COLORS[0],
  icon: '🏦',
};

@Component({
  selector: 'app-transactions',
  imports: [FormsModule, DatePipe, AmountInputDirective, FeatureGuideComponent, FabMenuComponent],
  templateUrl: './transactions.component.html',
})
export class TransactionsComponent implements OnInit {
  private txService = inject(TransactionService);
  private authService = inject(AuthService);
  private budgetService = inject(BudgetService);
  private accountService = inject(AccountService);

  readonly user = this.authService.user;
  readonly loading = this.txService.loading;
  readonly totalIncome = this.txService.totalIncome;
  readonly totalExpenses = this.txService.totalExpenses;
  readonly balance = this.txService.balance;

  readonly accounts = this.accountService.accounts;
  readonly ACCOUNT_PRESETS = ACCOUNT_PRESETS;
  readonly ACCOUNT_COLORS = ACCOUNT_COLORS;
  readonly ACCOUNT_TYPE_LABELS = ACCOUNT_TYPE_LABELS;

  readonly INCOME_TYPES = INCOME_TYPES;

  readonly guideSteps = [
    'Crea tus cuentas (Nequi, Bancolombia, efectivo…) con el botón "Gestionar" y pon el saldo que tienes hoy en cada una.',
    'Registra cada ingreso o egreso eligiendo la cuenta de donde sale o entra la plata. La categoría del presupuesto es opcional.',
    'Toca una tarjeta de cuenta arriba para ver solo los movimientos de esa cuenta y su saldo disponible.',
    'El saldo de cada cuenta se calcula así: saldo inicial + ingresos − egresos de esa cuenta.',
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

  // Cuenta seleccionada en las tarjetas (null = todas)
  selectedAccountId = signal<number | null>(null);

  // Gestor de cuentas
  showAccountsManager = signal(false);
  showAccountForm = signal(false);
  editingAccountId = signal<string | null>(null);
  accountForm: AccountForm = { ...EMPTY_ACCOUNT_FORM };
  accountFormLoading = signal(false);
  accountFormError = signal<string | null>(null);
  deleteAccountId = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    await this.budgetService.loadActiveCycle();
    await this.accountService.loadAll();
    await this.txService.loadAll();
  }

  readonly fabActions: FabAction[] = [
    { id: 'income', label: 'Nuevo ingreso', emoji: '💰' },
    { id: 'expense', label: 'Nuevo gasto', emoji: '💸' },
  ];

  onFabAction(id: string): void {
    this.openAddForm(id === 'income' ? 'income' : 'expense');
  }

  openAddForm(type: 'expense' | 'income' = 'expense'): void {
    this.editingId.set(null);
    this.form = {
      ...EMPTY_FORM,
      type,
      date: new Date().toISOString().split('T')[0],
      // Si hay una cuenta filtrada, la pre-selecciona; si no, la única que exista.
      accountId: this.selectedAccountId() ?? this.defaultAccountId(),
    };
    this.showForm.set(true);
  }

  openEditForm(tx: Transaction): void {
    this.editingId.set(tx.id);
    this.form = {
      type: tx.type,
      amount: tx.amount,
      date: tx.date,
      budgetCategoryId: tx.budgetCategoryId,
      accountId: tx.accountId,
      incomeType: tx.type === 'income' ? (tx.categoryName ?? '') : '',
      description: tx.type === 'expense' ? (tx.description ?? '') : '',
    };
    this.showForm.set(true);
  }

  private defaultAccountId(): number | null {
    const active = this.accounts().filter(a => !a.archived);
    return active.length === 1 ? +active[0].id : null;
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingId.set(null);
    this.formError.set(null);
  }

  async saveForm(): Promise<void> {
    const isExpense = this.form.type === 'expense';
    if (!this.form.amount || !this.form.date) return;
    // La categoría es opcional (el movimiento puede ir solo contra la cuenta).
    if (!this.form.accountId) return;
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
    this.selectedAccountId.set(null);
  }

  onTypeChange(): void {
    this.form.budgetCategoryId = null;
    this.form.incomeType = '';
  }

  // ── Cuentas: tarjetas y selección ──────────────────────────────────────────

  get visibleAccounts(): Account[] {
    return this.accounts().filter(a => !a.archived);
  }

  accountById(id: number | null): Account | undefined {
    if (id == null) return undefined;
    return this.accounts().find(a => +a.id === id);
  }

  // Disponible = saldo inicial + ingresos − egresos de esa cuenta.
  accountBalance(account: Account): number {
    const accId = +account.id;
    return this.txService.transactions().reduce((bal, t) => {
      if (t.accountId !== accId) return bal;
      return bal + (t.type === 'income' ? t.amount : -t.amount);
    }, account.initialBalance);
  }

  selectAccount(account: Account | null): void {
    const id = account ? +account.id : null;
    if (this.selectedAccountId() === id) {
      this.selectedAccountId.set(null);
      this.filter.accountId = 'all';
    } else {
      this.selectedAccountId.set(id);
      this.filter.accountId = id ?? 'all';
    }
  }

  // ── Cuentas: gestor (crear / editar / eliminar) ────────────────────────────

  openAccountsManager(): void {
    this.showAccountsManager.set(true);
  }

  closeAccountsManager(): void {
    this.showAccountsManager.set(false);
  }

  openAddAccount(): void {
    this.editingAccountId.set(null);
    this.accountForm = { ...EMPTY_ACCOUNT_FORM };
    this.accountFormError.set(null);
    this.showAccountForm.set(true);
  }

  selectPreset(preset: AccountPreset): void {
    this.accountForm = {
      ...this.accountForm,
      name: preset.name,
      type: preset.type,
      provider: preset.provider,
      color: preset.color,
      icon: preset.icon,
    };
  }

  onAccountTypeChange(type: AccountType): void {
    this.accountForm.type = type;
    this.accountForm.icon = ACCOUNT_TYPE_ICONS[type];
  }

  openEditAccount(account: Account): void {
    this.editingAccountId.set(account.id);
    this.accountForm = {
      name: account.name,
      type: account.type,
      provider: account.provider,
      initialBalance: account.initialBalance,
      color: account.color,
      icon: account.icon,
    };
    this.accountFormError.set(null);
    this.showAccountForm.set(true);
  }

  closeAccountForm(): void {
    this.showAccountForm.set(false);
    this.editingAccountId.set(null);
    this.accountFormError.set(null);
  }

  async saveAccountForm(): Promise<void> {
    if (!this.accountForm.name) return;
    this.accountFormLoading.set(true);
    this.accountFormError.set(null);
    try {
      const id = this.editingAccountId();
      if (id) {
        await this.accountService.update(id, this.accountForm);
      } else {
        await this.accountService.add(this.accountForm);
      }
      this.closeAccountForm();
    } catch (err: unknown) {
      this.accountFormError.set(err instanceof Error ? err.message : 'Error al guardar la cuenta');
    } finally {
      this.accountFormLoading.set(false);
    }
  }

  confirmDeleteAccount(id: string): void {
    this.deleteAccountId.set(id);
  }

  cancelDeleteAccount(): void {
    this.deleteAccountId.set(null);
  }

  async doDeleteAccount(): Promise<void> {
    const id = this.deleteAccountId();
    if (!id) return;
    try {
      await this.accountService.remove(id);
      if (this.selectedAccountId() === +id) this.selectAccount(null);
      this.deleteAccountId.set(null);
    } catch (err: unknown) {
      this.accountFormError.set(err instanceof Error ? err.message : 'No se pudo eliminar la cuenta');
      this.deleteAccountId.set(null);
    }
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

  // Hora 'HH:mm' del movimiento si el backend devolvió timestamp; vacío si solo hay fecha.
  txTime(tx: Transaction): string {
    return tx.createdAt && tx.createdAt.includes('T') ? tx.createdAt.substring(11, 16) : '';
  }
}
