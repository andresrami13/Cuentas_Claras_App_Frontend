import { Component, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AmountInputDirective } from '../../../shared/directives/amount-input.directive';
import { BudgetService } from '../../../core/services/budget.service';
import { FixedBudgetCategory } from '../../../core/models/budget.model';
import { EXPENSE_CATEGORIES, CATEGORY_LABELS, CATEGORY_ICONS } from '../../../core/models/transaction.model';

@Component({
  selector: 'app-budget-config',
  imports: [FormsModule, AmountInputDirective],
  templateUrl: './budget-config.component.html',
})
export class BudgetConfigComponent implements OnInit {
  private budgetService = inject(BudgetService);
  private router = inject(Router);

  readonly EXPENSE_CATEGORIES = EXPENSE_CATEGORIES;
  readonly CATEGORY_LABELS = CATEGORY_LABELS;
  readonly CATEGORY_ICONS = CATEGORY_ICONS;

  payDay = 1;
  nextPayDate = '';
  fixedCategories: FixedBudgetCategory[] = [];

  newCatName = '';
  newCatAmount: number | null = null;

  saveLoading = signal(false);
  saveError = signal<string | null>(null);
  saveSuccess = signal(false);

  async ngOnInit(): Promise<void> {
    await this.budgetService.loadConfig();
    const cfg = this.budgetService.config();
    if (cfg) {
      this.payDay = cfg.payDay;
      this.nextPayDate = cfg.nextPayDate;
      this.fixedCategories = cfg.fixedCategories.map(fc => ({ ...fc }));
    }
  }

  addFixedCategory(): void {
    const name = this.newCatName.trim();
    if (!name || !this.newCatAmount) return;
    this.fixedCategories.push({ name, amount: this.newCatAmount });
    this.newCatName = '';
    this.newCatAmount = null;
  }

  removeFixedCategory(index: number): void {
    this.fixedCategories.splice(index, 1);
  }

  getCategoryIcon(name: string): string {
    const key = Object.entries(CATEGORY_LABELS).find(
      ([, label]) => label === name
    )?.[0];
    return key ? CATEGORY_ICONS[key as keyof typeof CATEGORY_ICONS] : '📁';
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', maximumFractionDigits: 0,
    }).format(amount);
  }

  async save(): Promise<void> {
    if (!this.payDay || !this.nextPayDate) return;
    this.saveLoading.set(true);
    this.saveError.set(null);
    this.saveSuccess.set(false);
    try {
      await this.budgetService.saveConfig({
        documentNumber: '',
        payDay: this.payDay,
        nextPayDate: this.nextPayDate,
        fixedCategories: this.fixedCategories,
      });
      this.saveSuccess.set(true);
      setTimeout(() => this.saveSuccess.set(false), 3000);
    } catch (err: unknown) {
      this.saveError.set(err instanceof Error ? err.message : 'Error al guardar la configuración');
    } finally {
      this.saveLoading.set(false);
    }
  }

  goBack(): void {
    this.router.navigate(['/budget']);
  }
}
