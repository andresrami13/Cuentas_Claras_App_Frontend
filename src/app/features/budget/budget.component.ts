import { Component, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { BudgetService } from '../../core/services/budget.service';
import { AuthService } from '../../core/services/auth.service';
import { BudgetCategory, CreateCycleForm, AddCategoryForm } from '../../core/models/budget.model';
import {
  EXPENSE_CATEGORIES, CATEGORY_LABELS, CATEGORY_ICONS, TransactionCategory,
} from '../../core/models/transaction.model';

@Component({
  selector: 'app-budget',
  imports: [FormsModule, DecimalPipe],
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

  readonly EXPENSE_CATEGORIES = EXPENSE_CATEGORIES;
  readonly CATEGORY_LABELS = CATEGORY_LABELS;
  readonly CATEGORY_ICONS = CATEGORY_ICONS;

  // Create cycle modal
  showCreateForm = signal(false);
  createForm: CreateCycleForm = { startDate: '', endDate: '' };
  createLoading = signal(false);
  createError = signal<string | null>(null);

  // Add / edit category modal
  showCategoryForm = signal(false);
  editingCategoryId = signal<string | null>(null);
  categoryForm: AddCategoryForm = { name: '', assigned: null };
  categoryLoading = signal(false);
  categoryError = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    await this.budgetService.loadActiveCycle();
  }

  getSpentPct(cat: BudgetCategory): number {
    if (cat.assigned <= 0) return 0;
    return Math.min((cat.spent / cat.assigned) * 100, 100);
  }

  getCategoryIcon(name: string): string {
    const key = Object.entries(CATEGORY_LABELS).find(
      ([, label]) => label === name
    )?.[0] as TransactionCategory | undefined;
    return key ? CATEGORY_ICONS[key] : '📁';
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

  // ── Create cycle ───────────────────────────────────────────────────────────

  openCreateForm(): void {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString().split('T')[0];
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString().split('T')[0];
    this.createForm = { startDate: start, endDate: end };
    this.createError.set(null);
    this.showCreateForm.set(true);
  }

  closeCreateForm(): void {
    this.showCreateForm.set(false);
    this.createError.set(null);
  }

  async submitCreateCycle(): Promise<void> {
    if (!this.createForm.startDate || !this.createForm.endDate) return;
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
}
