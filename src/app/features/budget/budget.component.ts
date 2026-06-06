import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { AmountInputDirective } from '../../shared/directives/amount-input.directive';
import { BudgetService } from '../../core/services/budget.service';
import { AuthService } from '../../core/services/auth.service';
import { BudgetCategory, CreateCycleForm, AddCategoryForm, Periodicity, PERIODICITY_LABELS } from '../../core/models/budget.model';

@Component({
  selector: 'app-budget',
  imports: [FormsModule, DecimalPipe, AmountInputDirective],
  templateUrl: './budget.component.html',
})

export class BudgetComponent implements OnInit {
  private budgetService = inject(BudgetService);
  private router = inject(Router);
  protected authService = inject(AuthService);

  readonly cycle = this.budgetService.cycle;
  readonly loading = this.budgetService.loading;
  readonly totalAssigned = this.budgetService.totalAssigned;
  readonly totalSpent = this.budgetService.totalSpent;
  readonly totalAvailable = this.budgetService.totalAvailable;

  readonly PERIODICITY_LABELS = PERIODICITY_LABELS;
  readonly periodicityOptions: Periodicity[] = ['WEEKLY', 'BIWEEKLY', 'MONTHLY'];

  // Auto-creation state
  autoCreating = signal(false);
  autoCreated = signal(false);
  autoCreateError = signal<string | null>(null);

  // Manual cycle creation (fallback si auto-creación falla)
  showCreateForm = signal(false);
  createForm: CreateCycleForm = { paymentDay: 15, periodicity: 'MONTHLY' };
  createLoading = signal(false);
  createError = signal<string | null>(null);

  // Add / edit category modal
  showCategoryForm = signal(false);
  editingCategoryId = signal<string | null>(null);
  categoryForm: AddCategoryForm = { name: '', assigned: null };
  categoryLoading = signal(false);
  categoryError = signal<string | null>(null);

  readonly isLoadingAny = computed(() => this.loading() || this.autoCreating());

  async ngOnInit(): Promise<void> {
    await this.budgetService.loadConfig();
    await this.budgetService.loadActiveCycle();

    if (!this.budgetService.cycle()) {
      const config = this.budgetService.config();
      if (config?.payDay) {
        const today = new Date().toISOString().split('T')[0];
        const nextPay = config.nextPayDate || today;
        if (today >= nextPay) {
          this.autoCreating.set(true);
          try {
            await this.budgetService.autoCreateCycle();
            this.autoCreated.set(true);
            setTimeout(() => this.autoCreated.set(false), 5000);
          } catch (err: unknown) {
            this.autoCreateError.set(
              err instanceof Error ? err.message : 'No se pudo crear el ciclo automáticamente'
            );
          } finally {
            this.autoCreating.set(false);
          }
        }
      }
    }
  }

  // ── Computed state helpers ─────────────────────────────────────────────────

  get hasConfig(): boolean {
    return !!this.budgetService.config()?.payDay;
  }

  get nextCycleNotStarted(): boolean {
    const cfg = this.budgetService.config();
    if (!cfg?.nextPayDate) return false;
    return new Date().toISOString().split('T')[0] < cfg.nextPayDate;
  }

  get nextPayDateDisplay(): string {
    return this.formatDate(this.budgetService.config()?.nextPayDate ?? '');
  }

  get currentCycleMonthName(): string {
    const start = this.cycle()?.startDate;
    if (!start) return '';
    const [y, m] = start.split('-');
    return new Date(Number(y), Number(m) - 1, 1)
      .toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  getSpentPct(cat: BudgetCategory): number {
    if (cat.assigned <= 0) return 0;
    return Math.min((cat.spent / cat.assigned) * 100, 100);
  }

  getCategoryIcon(_name: string): string {
    return '📁';
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', maximumFractionDigits: 0,
    }).format(amount);
  }

  formatDate(date: string): string {
    if (!date) return '';
    const [y, m, d] = date.split('-');
    return `${d}/${m}/${y}`;
  }

  // ── Manual cycle creation (fallback) ──────────────────────────────────────

  openCreateForm(): void {
    const cfg = this.budgetService.config();
    this.createForm = {
      paymentDay: cfg?.payDay ?? 15,
      periodicity: cfg?.periodicity ?? 'MONTHLY',
    };
    this.createError.set(null);
    this.showCreateForm.set(true);
  }

  closeCreateForm(): void {
    this.showCreateForm.set(false);
    this.createError.set(null);
  }

  async submitCreateCycle(): Promise<void> {
    if (!this.createForm.paymentDay || !this.createForm.periodicity) return;
    this.createLoading.set(true);
    this.createError.set(null);
    try {
      await this.budgetService.createCycle(this.createForm);
      this.showCreateForm.set(false);
    } catch (err: unknown) {
      this.createError.set(err instanceof Error ? err.message : 'Error al crear el ciclo');
    } finally {
      this.createLoading.set(false);
    }
  }

  // ── Add / edit category ────────────────────────────────────────────────────

  openAddCategory(): void {
    this.editingCategoryId.set(null);
    this.categoryForm = { name: '', assigned: null };
    this.categoryError.set(null);
    this.showCategoryForm.set(true);
  }

  openEditCategory(cat: BudgetCategory): void {
    this.editingCategoryId.set(cat.id);
    this.categoryForm = { name: cat.name, assigned: cat.assigned };
    this.categoryError.set(null);
    this.showCategoryForm.set(true);
  }

  closeCategoryForm(): void {
    this.showCategoryForm.set(false);
    this.editingCategoryId.set(null);
    this.categoryError.set(null);
  }

  async saveCategoryForm(): Promise<void> {
    if (!this.categoryForm.name || !this.categoryForm.assigned) return;
    this.categoryLoading.set(true);
    this.categoryError.set(null);
    try {
      const editId = this.editingCategoryId();
      if (editId) {
        await this.budgetService.updateCategory(editId, this.categoryForm);
      } else {
        await this.budgetService.addCategory(this.categoryForm);
      }
      this.closeCategoryForm();
    } catch (err: unknown) {
      this.categoryError.set(err instanceof Error ? err.message : 'Error al guardar la categoría');
    } finally {
      this.categoryLoading.set(false);
    }
  }

  goToConfig(): void {
    this.router.navigate(['/budget/config']);
  }

  goToNewMovement(): void {
    this.router.navigate(['/transactions']);
  }
}
