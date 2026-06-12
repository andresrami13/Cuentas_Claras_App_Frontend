import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { GoalService, GoalForm } from '../../core/services/goal.service';
import { FinancialGoal } from '../../core/models/goal.model';
import { FeatureGuideComponent } from '../../shared/components/feature-guide/feature-guide.component';

const EMPTY_FORM: GoalForm = {
  name: '',
  description: '',
  targetAmount: null,
  currentAmount: null,
  startDate: new Date().toISOString().split('T')[0],
  targetDate: '',
  status: 'ACTIVE',
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Activa',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
};

@Component({
  selector: 'app-goals',
  imports: [FormsModule, RouterLink, FeatureGuideComponent],
  templateUrl: './goals.component.html',
})
export class GoalsComponent implements OnInit {
  private readonly goalService = inject(GoalService);

  readonly goals = this.goalService.goals;
  readonly loading = this.goalService.loading;

  showForm = signal(false);
  editingId = signal<string | null>(null);
  form: GoalForm = { ...EMPTY_FORM };
  formLoading = signal(false);
  formError = signal<string | null>(null);
  targetAmountDisplay = '';
  currentAmountDisplay = '';
  deleteConfirmId = signal<string | null>(null);
  deleteError = signal<string | null>(null);

  readonly guideSteps = [
    "Crea una meta con nombre, monto objetivo y fecha límite. Ej: 'Viaje a la playa, $2'000.000, para diciembre'.",
    'Cada vez que apartes plata para tu meta, edítala y actualiza el monto actual: la barra de progreso te muestra qué tan cerca estás.',
    'La app te dice cuántos días te quedan para la fecha límite, así sabes si vas a buen ritmo.',
    'Pídele consejos al Coach IA sobre cualquier meta: analizará tus finanzas reales y te dirá cómo lograrla.',
  ];

  readonly STATUS_LABELS = STATUS_LABELS;
  readonly statuses = ['ACTIVE', 'COMPLETED', 'CANCELLED'];

  async ngOnInit(): Promise<void> {
    await this.goalService.loadAll();
  }

  openCreateForm(): void {
    this.editingId.set(null);
    this.form = { ...EMPTY_FORM, startDate: new Date().toISOString().split('T')[0] };
    this.targetAmountDisplay = '';
    this.currentAmountDisplay = '';
    this.formError.set(null);
    this.showForm.set(true);
  }

  openEditForm(goal: FinancialGoal): void {
    this.editingId.set(goal.id);
    this.form = {
      name: goal.name,
      description: goal.description ?? '',
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount,
      startDate: goal.startDate,
      targetDate: goal.deadline,
      status: goal.status,
    };
    this.targetAmountDisplay = this.formatAmountDisplay(goal.targetAmount);
    this.currentAmountDisplay = this.formatAmountDisplay(goal.currentAmount);
    this.formError.set(null);
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingId.set(null);
    this.formError.set(null);
  }

  async saveForm(): Promise<void> {
    if (!this.form.name || !this.form.targetAmount || !this.form.targetDate) return;
    this.formLoading.set(true);
    this.formError.set(null);
    try {
      const id = this.editingId();
      if (id) {
        await this.goalService.update(id, this.form);
      } else {
        await this.goalService.create(this.form);
      }
      this.closeForm();
    } catch (err: unknown) {
      this.formError.set(err instanceof Error ? err.message : 'Error al guardar la meta');
    } finally {
      this.formLoading.set(false);
    }
  }

  confirmDelete(id: string): void {
    this.deleteError.set(null);
    this.deleteConfirmId.set(id);
  }

  cancelDelete(): void {
    this.deleteConfirmId.set(null);
  }

  async doDelete(): Promise<void> {
    const id = this.deleteConfirmId();
    if (!id) return;
    this.deleteError.set(null);
    try {
      await this.goalService.delete(id);
      this.deleteConfirmId.set(null);
    } catch (err: unknown) {
      this.deleteError.set(err instanceof Error ? err.message : 'Error al eliminar la meta');
    }
  }

  progressPercent(goal: FinancialGoal): number {
    if (!goal.targetAmount) return 0;
    return Math.min(Math.round((goal.currentAmount / goal.targetAmount) * 100), 100);
  }

  daysLeft(deadline: string): number {
    const d = new Date(deadline);
    const today = new Date();
    return Math.max(0, Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount);
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  private formatAmountDisplay(value: number | null): string {
    if (!value) return '';
    return new Intl.NumberFormat('es-CO').format(value);
  }

  onAmountInput(field: 'targetAmount' | 'currentAmount', event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '');
    const num = digits ? parseInt(digits, 10) : null;
    this.form[field] = num;
    const formatted = num ? new Intl.NumberFormat('es-CO').format(num) : '';
    if (field === 'targetAmount') {
      this.targetAmountDisplay = formatted;
    } else {
      this.currentAmountDisplay = formatted;
    }
    input.value = formatted;
  }
}
