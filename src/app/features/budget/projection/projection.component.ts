import { Component, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { AmountInputDirective } from '../../../shared/directives/amount-input.directive';
import { ProjectionService } from '../../../core/services/projection.service';
import { BudgetService } from '../../../core/services/budget.service';
import { ProjectionItem, PROJECTION_SOURCE_LABELS } from '../../../core/models/projection.model';

const GUIDE_SEEN_KEY = 'spendcount_projection_guide_seen';

@Component({
  selector: 'app-projection',
  imports: [FormsModule, DecimalPipe, AmountInputDirective],
  templateUrl: './projection.component.html',
})
export class ProjectionComponent implements OnInit {
  protected readonly svc = inject(ProjectionService);
  private readonly budgetService = inject(BudgetService);
  private readonly router = inject(Router);

  readonly SOURCE_LABELS = PROJECTION_SOURCE_LABELS;

  // Guía para usuarios nuevos: visible la primera vez, reabrible con el botón "?"
  showGuide = signal(!localStorage.getItem(GUIDE_SEEN_KEY));

  showApplyModal = signal(false);
  applyLoading = signal(false);
  applyError = signal<string | null>(null);
  appliedToast = signal(false);

  showResetConfirm = signal(false);

  async ngOnInit(): Promise<void> {
    await this.svc.init();
  }

  get nextMonthName(): string {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return next.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
  }

  get hasBudgetConfig(): boolean {
    return !!this.budgetService.config()?.payDay;
  }

  get canApply(): boolean {
    return this.svc.items().some(i => i.name.trim() && (i.amount ?? 0) > 0);
  }

  dismissGuide(): void {
    this.showGuide.set(false);
    localStorage.setItem(GUIDE_SEEN_KEY, '1');
  }

  reopenGuide(): void {
    this.showGuide.set(true);
  }

  useCurrentIncome(): void {
    this.svc.setIncome(this.svc.incomeThisMonth());
  }

  onItemName(item: ProjectionItem, name: string): void {
    this.svc.updateItem(item, { name });
  }

  onItemAmount(item: ProjectionItem, amount: number | null): void {
    this.svc.updateItem(item, { amount });
  }

  confirmReset(): void {
    this.showResetConfirm.set(false);
    this.svc.resetToSuggestions();
  }

  openApplyModal(): void {
    this.applyError.set(null);
    this.showApplyModal.set(true);
  }

  async doApply(): Promise<void> {
    this.applyLoading.set(true);
    this.applyError.set(null);
    try {
      await this.svc.applyToNextCycle();
      this.showApplyModal.set(false);
      this.appliedToast.set(true);
      setTimeout(() => this.appliedToast.set(false), 5000);
    } catch (err: unknown) {
      this.applyError.set(err instanceof Error ? err.message : 'No se pudo aplicar la proyección');
    } finally {
      this.applyLoading.set(false);
    }
  }

  goBack(): void {
    this.router.navigate(['/budget']);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', maximumFractionDigits: 0,
    }).format(amount);
  }
}
