import { Component, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AmountInputDirective } from '../../../shared/directives/amount-input.directive';
import { BudgetService } from '../../../core/services/budget.service';
import { FixedBudgetCategory, Periodicity, PERIODICITY_LABELS } from '../../../core/models/budget.model';

@Component({
  selector: 'app-budget-config',
  imports: [FormsModule, AmountInputDirective],
  templateUrl: './budget-config.component.html',
})
export class BudgetConfigComponent implements OnInit {
  private budgetService = inject(BudgetService);
  private router = inject(Router);

  readonly PERIODICITY_LABELS = PERIODICITY_LABELS;
  readonly periodicityOptions: Periodicity[] = ['WEEKLY', 'BIWEEKLY', 'MONTHLY'];

  payDay = 15;
  periodicity: Periodicity = 'MONTHLY';
  nextPayDate = '';
  fixedCategories: FixedBudgetCategory[] = [];

  newCatName = '';
  newCatAmount: number | null = null;

  saveLoading = signal(false);
  saveError = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    await this.budgetService.loadConfig();
    const cfg = this.budgetService.config();
    if (cfg) {
      this.payDay = cfg.payDay;
      this.periodicity = cfg.periodicity;
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

  getCategoryIcon(_name: string): string {
    return '📁';
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', maximumFractionDigits: 0,
    }).format(amount);
  }

  async save(): Promise<void> {
    if (!this.payDay || !this.nextPayDate || !this.periodicity) return;
    this.saveLoading.set(true);
    this.saveError.set(null);
    try {
      await this.budgetService.saveConfig({
        documentNumber: '',
        payDay: this.payDay,
        periodicity: this.periodicity,
        nextPayDate: this.nextPayDate,
        fixedCategories: this.fixedCategories,
      });
      await this.budgetService.syncCycleWithConfig();
      this.router.navigate(['/budget']);
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
