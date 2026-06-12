import { Injectable, signal, computed, inject } from '@angular/core';
import { ProjectionItem, ProjectionKind, ProjectionState } from '../models/projection.model';
import { AuthService } from './auth.service';
import { BudgetService } from './budget.service';
import { TransactionService } from './transaction.service';

const STORAGE_PREFIX = 'spendcount_projection_';

@Injectable({ providedIn: 'root' })
export class ProjectionService {
  private readonly auth = inject(AuthService);
  private readonly budget = inject(BudgetService);
  private readonly tx = inject(TransactionService);

  private readonly _income = signal<number | null>(null);
  private readonly _items = signal<ProjectionItem[]>([]);
  private readonly _initializing = signal(false);

  readonly expectedIncome = this._income.asReadonly();
  readonly items = this._items.asReadonly();
  readonly initializing = this._initializing.asReadonly();

  readonly commitments = computed(() => this._items().filter(i => i.kind === 'commitment'));
  readonly expenses = computed(() => this._items().filter(i => i.kind === 'expense'));

  readonly totalCommitments = computed(() =>
    this.commitments().reduce((s, i) => s + (i.amount ?? 0), 0)
  );

  readonly totalExpenses = computed(() =>
    this.expenses().reduce((s, i) => s + (i.amount ?? 0), 0)
  );

  readonly totalProjected = computed(() => this.totalCommitments() + this.totalExpenses());

  readonly balance = computed(() => (this._income() ?? 0) - this.totalProjected());

  readonly committedPct = computed(() => {
    const income = this._income() ?? 0;
    if (income <= 0) return 0;
    return Math.min((this.totalProjected() / income) * 100, 100);
  });

  /** Ingresos registrados en el mes calendario actual (pista para el usuario). */
  readonly incomeThisMonth = computed(() => {
    const month = new Date().toISOString().slice(0, 7);
    return this.tx.transactions()
      .filter(t => t.type === 'income' && t.date.startsWith(month))
      .reduce((s, t) => s + t.amount, 0);
  });

  private get documentNumber(): string {
    return this.auth.user()?.documentNumber ?? '';
  }

  private get storageKey(): string {
    return `${STORAGE_PREFIX}${this.documentNumber}`;
  }

  async init(): Promise<void> {
    this._initializing.set(true);
    try {
      if (!this.budget.config()) await this.budget.loadConfig();
      if (!this.budget.cycle()) await this.budget.loadActiveCycle();
      if (this.tx.transactions().length === 0) await this.tx.loadAll();

      const saved = this.loadSaved();
      if (saved) {
        this._income.set(saved.expectedIncome);
        this._items.set(saved.items);
      } else {
        this.resetToSuggestions();
      }
    } finally {
      this._initializing.set(false);
    }
  }

  setIncome(value: number | null): void {
    this._income.set(value);
    this.save();
  }

  addItem(kind: ProjectionKind): void {
    this._items.update(arr => [...arr, { name: '', amount: null, kind, source: 'manual' }]);
    this.save();
  }

  updateItem(item: ProjectionItem, patch: Partial<ProjectionItem>): void {
    this._items.update(arr =>
      arr.map(x => x === item ? { ...x, ...patch, source: 'manual' as const } : x)
    );
    this.save();
  }

  removeItem(item: ProjectionItem): void {
    this._items.update(arr => arr.filter(x => x !== item));
    this.save();
  }

  /** Vuelve a las sugerencias automáticas (plantilla + promedio histórico). */
  resetToSuggestions(): void {
    this._income.set(null);
    this._items.set(this.buildSuggestions());
    this.save();
  }

  /**
   * Convierte la proyección en las categorías fijas del próximo ciclo
   * (usa el endpoint de configuración que ya existe; el ciclo actual no se toca).
   */
  async applyToNextCycle(): Promise<void> {
    const cfg = this.budget.config();
    if (!cfg) throw new Error('Primero configura tu presupuesto (día de pago) en la pantalla de configuración');

    const merged = new Map<string, number>();
    for (const i of this._items()) {
      const name = i.name.trim();
      const amount = i.amount ?? 0;
      if (!name || amount <= 0) continue;
      merged.set(name, (merged.get(name) ?? 0) + amount);
    }
    if (merged.size === 0) throw new Error('Agrega al menos una categoría con monto para aplicar');

    await this.budget.saveConfig({
      ...cfg,
      fixedCategories: [...merged.entries()].map(([name, amount]) => ({ name, amount })),
    });
  }

  // ── Sugerencias ─────────────────────────────────────────────────────────────

  private buildSuggestions(): ProjectionItem[] {
    const history = this.historyByCategory();
    const items: ProjectionItem[] = [];
    const seen = new Set<string>();

    // Sugerencia por categoría:
    // 1. Promedio de meses anteriores completos (el mes en curso se excluye porque está a medias)
    // 2. Sin meses anteriores: el mayor entre la plantilla y lo gastado en lo que va del mes
    // 3. Sin ningún dato de gasto: el monto de la plantilla
    const suggest = (name: string, templateAmount: number): { amount: number; source: 'history' | 'template' } => {
      const h = history.get(name);
      if (h?.pastAvg) return { amount: h.pastAvg, source: 'history' };
      const currentSpend = h?.currentSpend ?? 0;
      if (currentSpend > templateAmount) return { amount: currentSpend, source: 'history' };
      return { amount: templateAmount, source: 'template' };
    };

    // Base: plantilla de categorías fijas; si no hay, las del ciclo actual
    const template: { name: string; amount: number }[] =
      (this.budget.config()?.fixedCategories?.length
        ? this.budget.config()!.fixedCategories
        : (this.budget.cycle()?.categories ?? []).map(c => ({ name: c.name, amount: c.assigned })));

    for (const t of template) {
      if (!t.name || seen.has(t.name)) continue;
      seen.add(t.name);
      const s = suggest(t.name, t.amount);
      items.push({ name: t.name, amount: s.amount, kind: 'expense', source: s.source });
    }

    // Categorías con gasto que no están en la plantilla
    for (const [name, h] of history) {
      if (seen.has(name) || name === 'Sin categoría') continue;
      const amount = h.pastAvg ?? h.currentSpend;
      if (amount <= 0) continue;
      seen.add(name);
      items.push({ name, amount, kind: 'expense', source: 'history' });
    }

    return items;
  }

  /**
   * Gasto por categoría: promedio de hasta 3 meses anteriores completos
   * (null si no hay meses anteriores) y lo gastado en el mes en curso.
   */
  private historyByCategory(): Map<string, { pastAvg: number | null; currentSpend: number }> {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const byCatMonth = new Map<string, Map<string, number>>();
    for (const t of this.tx.transactions()) {
      if (t.type !== 'expense' || !t.date || !t.categoryName) continue;
      const month = t.date.slice(0, 7);
      const months = byCatMonth.get(t.categoryName) ?? new Map<string, number>();
      months.set(month, (months.get(month) ?? 0) + t.amount);
      byCatMonth.set(t.categoryName, months);
    }

    const result = new Map<string, { pastAvg: number | null; currentSpend: number }>();
    for (const [name, months] of byCatMonth) {
      const past = [...months.entries()]
        .filter(([month]) => month < currentMonth)
        .sort((a, b) => b[0].localeCompare(a[0]))
        .slice(0, 3)
        .map(([, total]) => total);
      result.set(name, {
        pastAvg: past.length
          ? Math.round(past.reduce((s, v) => s + v, 0) / past.length)
          : null,
        currentSpend: months.get(currentMonth) ?? 0,
      });
    }
    return result;
  }

  // ── Persistencia local ──────────────────────────────────────────────────────

  private save(): void {
    const state: ProjectionState = {
      expectedIncome: this._income(),
      items: this._items(),
    };
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(state));
    } catch { /* almacenamiento lleno o no disponible: la simulación sigue en memoria */ }
  }

  private loadSaved(): ProjectionState | null {
    try {
      const raw = localStorage.getItem(this.storageKey);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
}
