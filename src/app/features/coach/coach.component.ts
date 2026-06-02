import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { CoachService } from '../../core/services/coach.service';
import { GoalService } from '../../core/services/goal.service';
import { TransactionService } from '../../core/services/transaction.service';
import { FinancialGoal } from '../../core/models/goal.model';

const SUGGESTIONS = [
  '¿Cómo puedo alcanzar esta meta más rápido?',
  'Analiza mis hábitos de gasto y dame consejos',
];

@Component({
  selector: 'app-coach',
  imports: [FormsModule, RouterLink],
  templateUrl: './coach.component.html',
})
export class CoachComponent implements OnInit {
  private readonly coachService = inject(CoachService);
  private readonly goalService = inject(GoalService);
  private readonly txService = inject(TransactionService);
  private readonly route = inject(ActivatedRoute);

  readonly goals = this.goalService.goals;
  readonly selectedGoal = this.coachService.selectedGoal;
  readonly messages = this.coachService.filteredMessages;
  readonly isLoading = this.coachService.isLoading;
  readonly initializing = this.coachService.initializing;
  readonly totalIncome = this.txService.totalIncome;
  readonly totalExpenses = this.txService.totalExpenses;

  readonly suggestions = SUGGESTIONS;

  question = '';
  sendError: string | null = null;

  async ngOnInit(): Promise<void> {
    await Promise.all([
      this.coachService.init(),
      this.txService.loadAll(),
    ]);
    this.autoSelectGoal();
  }

  private autoSelectGoal(): void {
    const goalId = this.route.snapshot.queryParamMap.get('goalId');
    const allGoals = this.goalService.goals();
    if (!allGoals.length) return;

    const target = goalId
      ? allGoals.find(g => g.id === goalId)
      : allGoals.find(g => g.status === 'ACTIVE') ?? allGoals[0];

    if (target) this.coachService.selectGoal(target);
  }

  selectGoal(goal: FinancialGoal): void {
    this.coachService.selectGoal(goal);
    this.sendError = null;
  }

  get progressPercent(): number {
    const g = this.selectedGoal();
    if (!g) return 0;
    return Math.min(Math.round((g.currentAmount / g.targetAmount) * 100), 100);
  }

  get daysLeft(): number {
    const g = this.selectedGoal();
    if (!g) return 0;
    const deadline = new Date(g.deadline);
    const today = new Date();
    return Math.max(0, Math.round((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
  }

  applySuggestion(q: string): void {
    this.question = q;
  }

  async send(): Promise<void> {
    const q = this.question.trim();
    if (!q || this.isLoading()) return;
    this.question = '';
    this.sendError = null;
    try {
      await this.coachService.requestAdvice(q);
    } catch (err) {
      this.sendError = err instanceof Error ? err.message : 'Error al obtener el análisis';
    }
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount);
  }

  formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  }

  renderMarkdown(text: string): string {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^(#{1,3})\s(.+)$/gm, (_, _h, t) => `<span class="font-bold text-[#1C2833] text-base block mb-1">${t}</span>`)
      .replace(/\n\n/g, '</p><p class="mb-2">')
      .replace(/\n/g, '<br>')
      .replace(/^(\d+)\.\s(.+)$/gm, '<li class="ml-4 list-decimal">$2</li>');
  }
}
