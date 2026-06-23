import { Component, ElementRef, effect, inject, signal, viewChild, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { CoachService } from '../../core/services/coach.service';
import { GoalService } from '../../core/services/goal.service';
import { TransactionService } from '../../core/services/transaction.service';
import { FinancialGoal } from '../../core/models/goal.model';
import { FeatureGuideComponent } from '../../shared/components/feature-guide/feature-guide.component';

const SUGGESTIONS = [
  '¿Cómo puedo alcanzar esta meta más rápido?',
  'Analiza mis hábitos de gasto y dame consejos',
];

@Component({
  selector: 'app-coach',
  imports: [FormsModule, RouterLink, FeatureGuideComponent],
  templateUrl: './coach.component.html',
})
export class CoachComponent implements OnInit, OnDestroy {
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

  readonly guideSteps = [
    'Toca la meta sobre la que quieres hablar y el chat se abrirá en pantalla completa.',
    "Escribe tu pregunta o toca una de las sugerencias. Ej: '¿Cómo puedo alcanzar esta meta más rápido?'",
    'El coach analiza tus ingresos, tus gastos y tu avance, y te responde con recomendaciones concretas para ti.',
    'Tu conversación queda guardada por meta: ciérrala con la ✕ y vuelve cuando quieras.',
  ];

  question = '';
  sendError: string | null = null;

  chatOpen = signal(false);

  /** Alto visible cuando el teclado del celular está abierto (null = teclado cerrado). */
  keyboardViewportHeight = signal<number | null>(null);

  private readonly chatScroll = viewChild<ElementRef<HTMLDivElement>>('chatScroll');
  private readonly chatInput = viewChild<ElementRef<HTMLInputElement>>('chatInput');

  // El visualViewport refleja el área realmente visible: cuando el teclado se
  // abre, ajustamos la altura del chat para que el input quede flotando sobre él
  private readonly onViewportChange = (): void => {
    if (!this.chatOpen()) return;
    const vv = window.visualViewport;
    if (!vv) return;
    const keyboardOpen = vv.height < window.innerHeight - 50;
    this.keyboardViewportHeight.set(keyboardOpen ? Math.round(vv.height) : null);
    window.scrollTo(0, 0);
    this.scrollToBottom();
  };

  constructor() {
    // Auto-scroll al último mensaje cada vez que cambia la conversación
    effect(() => {
      this.messages();
      this.isLoading();
      if (this.chatOpen()) {
        setTimeout(() => this.scrollToBottom());
      }
    });
  }

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

    if (goalId) {
      // Llegó desde Metas: abrir el chat de esa meta directamente
      const target = allGoals.find(g => g.id === goalId);
      if (target) {
        this.openChat(target);
        return;
      }
    }
    const active = allGoals.find(g => g.status === 'ACTIVE') ?? allGoals[0];
    if (active) this.coachService.selectGoal(active);
  }

  openChat(goal: FinancialGoal): void {
    this.coachService.selectGoal(goal);
    this.sendError = null;
    this.chatOpen.set(true);
    window.visualViewport?.addEventListener('resize', this.onViewportChange);
    window.visualViewport?.addEventListener('scroll', this.onViewportChange);
    setTimeout(() => {
      this.scrollToBottom();
      this.chatInput()?.nativeElement.focus();
    });
  }

  closeChat(): void {
    this.chatOpen.set(false);
    this.sendError = null;
    this.keyboardViewportHeight.set(null);
    window.visualViewport?.removeEventListener('resize', this.onViewportChange);
    window.visualViewport?.removeEventListener('scroll', this.onViewportChange);
  }

  ngOnDestroy(): void {
    window.visualViewport?.removeEventListener('resize', this.onViewportChange);
    window.visualViewport?.removeEventListener('scroll', this.onViewportChange);
  }

  onInputFocus(): void {
    // Esperar a que el teclado termine de abrir y volver al último mensaje
    setTimeout(() => {
      window.scrollTo(0, 0);
      this.scrollToBottom();
    }, 300);
  }

  private scrollToBottom(): void {
    const el = this.chatScroll()?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }

  get progressPercent(): number {
    const g = this.selectedGoal();
    if (!g) return 0;
    return Math.min(Math.round((g.currentAmount / g.targetAmount) * 100), 100);
  }

  progressPercentFor(goal: FinancialGoal): number {
    if (!goal.targetAmount) return 0;
    return Math.min(Math.round((goal.currentAmount / goal.targetAmount) * 100), 100);
  }

  daysLeftFor(goal: FinancialGoal): number {
    const deadline = new Date(goal.deadline);
    const today = new Date();
    return Math.max(0, Math.round((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
  }

  applySuggestion(q: string): void {
    this.question = q;
    this.chatInput()?.nativeElement.focus();
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
      .replace(/^(#{1,3})\s(.+)$/gm, (_, _h, t) => `<span class="font-bold text-ink text-base block mb-1">${t}</span>`)
      .replace(/\n\n/g, '</p><p class="mb-2">')
      .replace(/\n/g, '<br>')
      .replace(/^(\d+)\.\s(.+)$/gm, '<li class="ml-4 list-decimal">$2</li>');
  }
}
