import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DecimalPipe, NgTemplateOutlet, NgClass } from '@angular/common';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { LucideAngularModule, LucideIconData } from 'lucide-angular';
import { CATEGORY_ICON_GROUPS, getCategoryIconData, DEFAULT_CATEGORY_ICON } from '../../shared/category-icons';
import { AmountInputDirective } from '../../shared/directives/amount-input.directive';
import { FeatureGuideComponent } from '../../shared/components/feature-guide/feature-guide.component';
import { FabMenuComponent, FabAction } from '../../shared/components/fab-menu/fab-menu.component';
import { BudgetService } from '../../core/services/budget.service';
import { TransactionService } from '../../core/services/transaction.service';
import { AuthService } from '../../core/services/auth.service';
import { BudgetCategory, AddCategoryForm } from '../../core/models/budget.model';
import { TransactionForm, INCOME_TYPES } from '../../core/models/transaction.model';

const EMPTY_TX_FORM: TransactionForm = {
  type: 'expense',
  amount: null,
  date: new Date().toISOString().split('T')[0],
  budgetCategoryId: null,
  accountId: null,
  incomeType: '',
  description: '',
};

@Component({
  selector: 'app-budget',
  imports: [FormsModule, DecimalPipe, NgTemplateOutlet, NgClass, DragDropModule, LucideAngularModule, AmountInputDirective, FeatureGuideComponent, FabMenuComponent],
  templateUrl: './budget.component.html',
})
export class BudgetComponent implements OnInit {
  private budgetService = inject(BudgetService);
  private txService = inject(TransactionService);
  private router = inject(Router);
  protected authService = inject(AuthService);

  readonly cycle = this.budgetService.cycle;
  readonly loading = this.budgetService.loading;
  readonly totalAssigned = this.budgetService.totalAssigned;
  readonly totalSpent = this.budgetService.totalSpent;
  readonly totalAvailable = this.budgetService.totalAvailable;

  readonly totalIncome = this.txService.totalIncome;
  readonly totalExpenses = this.txService.totalExpenses;
  readonly balance = this.txService.balance;

  // Sobrante = plata real (balance) menos lo que sigue reservado en categorías
  readonly sobrante = computed(() => this.balance() - this.totalAvailable());

  // ── Tarjeta-flip de resumen (solo móvil) ───────────────────────────────────
  // Cicla Balance (0) → Cat. Disponible (1) → Sobrante (2) con un giro 3D de 180°.
  // Se usan dos caras (front/back); cada toque suma 180° y precarga la cara que
  // viene, de modo que el contenido siempre cae derecho (sin texto espejado).
  readonly summaryStep = signal(0);
  readonly summaryRotation = computed(() => this.summaryStep() * 180);
  readonly summaryIndex = computed(() => this.summaryStep() % 3);
  readonly summaryFaceA = computed(() => {
    const s = this.summaryStep();
    return (s % 2 === 0 ? s : s + 1) % 3;
  });
  readonly summaryFaceB = computed(() => {
    const s = this.summaryStep();
    return (s % 2 === 1 ? s : s + 1) % 3;
  });

  cycleSummary(): void {
    this.summaryStep.update(s => s + 1);
  }

  readonly guideSteps = [
    'Configura tu día de pago y tus categorías fijas en el botón de configuración (⚙️). Cuando recibas tu pago, pulsa "Iniciar ciclo" y se creará el ciclo con esas categorías.',
    'Crea categorías con un monto asignado: Mercado, Transporte, Arriendo... piensa en ellas como sobres donde repartes tu plata.',
    'Registra cada gasto con "Nuevo movimiento" eligiendo su categoría: la barra te muestra cuánto llevas gastado y cuánto te queda en cada sobre.',
    'Usa el botón 📈 para proyectar tu próximo mes: simula cuánto recibirás y gastarás antes de que llegue.',
  ];

  readonly INCOME_TYPES = INCOME_TYPES;

  // Menú desplegable del engranaje (configuración / proyección / ayuda)
  headerMenuOpen = signal(false);

  readonly fabActions: FabAction[] = [
    { id: 'category', label: 'Nueva categoría', emoji: '📁' },
    { id: 'income', label: 'Nuevo ingreso', emoji: '💰' },
    { id: 'expense', label: 'Nuevo gasto', emoji: '💸' },
  ];

  onFabAction(id: string): void {
    if (id === 'expense') this.openTxForm(null, 'expense');
    else if (id === 'income') this.openTxForm(null, 'income');
    else if (id === 'category') this.openAddCategory();
  }

  // Disparo manual del ciclo ("Iniciar ciclo")
  startingCycle = signal(false);
  startError = signal<string | null>(null);
  showStartConfirm = signal(false); // confirmación cuando ya hay un ciclo activo

  // Add / edit category modal
  showCategoryForm = signal(false);
  editingCategoryId = signal<string | null>(null);
  categoryForm: AddCategoryForm = { name: '', assigned: null };
  categoryLoading = signal(false);
  categoryError = signal<string | null>(null);

  // New transaction modal
  showTxForm = signal(false);
  txForm: TransactionForm = { ...EMPTY_TX_FORM };
  txFormLoading = signal(false);
  txFormError = signal<string | null>(null);
  payFullRemaining = false; // "Pagar todo el disponible de la categoría"

  get selectedTxCategory(): BudgetCategory | null {
    const id = this.txForm.budgetCategoryId;
    if (id == null) return null;
    return this.budgetCategories.find(c => +c.id === id) ?? null;
  }

  readonly isLoadingAny = computed(() => this.loading() || this.startingCycle());

  async ngOnInit(): Promise<void> {
    await this.budgetService.loadConfig();
    await this.budgetService.loadActiveCycle();
    await this.txService.loadAll();

    this.loadCategoryOrder();
    this.loadCategoryIcons();
  }

  // ── Computed state helpers ─────────────────────────────────────────────────

  get hasConfig(): boolean {
    return !!this.budgetService.config()?.payDay;
  }

  // Nº de categorías fijas configuradas — se usa para anticipar qué traerá el ciclo.
  get fixedCategoriesCount(): number {
    return this.budgetService.config()?.fixedCategories.length ?? 0;
  }

  get budgetCategories(): BudgetCategory[] {
    return this.budgetService.cycle()?.categories ?? [];
  }

  get activeCategories(): BudgetCategory[] {
    return this.applyOrder(this.budgetCategories.filter(c => c.spent < c.assigned));
  }

  get completedCategories(): BudgetCategory[] {
    return this.budgetCategories.filter(c => c.spent >= c.assigned);
  }

  showCompletadas = signal(false);

  // ── Orden personalizado de categorías (drag & drop) ────────────────────────
  // Se guarda en localStorage por ciclo: una lista de ids en el orden preferido.
  // Las categorías que no estén en la lista (nuevas) caen al final.
  private readonly categoryOrder = signal<string[]>([]);

  private orderStorageKey(): string | null {
    const id = this.cycle()?.id;
    return id ? `budget:catOrder:${id}` : null;
  }

  private loadCategoryOrder(): void {
    const key = this.orderStorageKey();
    if (!key) { this.categoryOrder.set([]); return; }
    try {
      const raw = localStorage.getItem(key);
      this.categoryOrder.set(raw ? JSON.parse(raw) : []);
    } catch {
      this.categoryOrder.set([]);
    }
  }

  private saveCategoryOrder(ids: string[]): void {
    this.categoryOrder.set(ids);
    const key = this.orderStorageKey();
    if (key) {
      try { localStorage.setItem(key, JSON.stringify(ids)); } catch { /* sin persistencia disponible */ }
    }
  }

  // Ordena según la preferencia guardada; mantiene estable el resto.
  private applyOrder(cats: BudgetCategory[]): BudgetCategory[] {
    const order = this.categoryOrder();
    if (order.length === 0) return cats;
    const rank = (id: string) => {
      const i = order.indexOf(id);
      return i === -1 ? Number.MAX_SAFE_INTEGER : i;
    };
    return [...cats].sort((a, b) => rank(a.id) - rank(b.id));
  }

  onCategoryDrop(event: CdkDragDrop<BudgetCategory[]>): void {
    if (event.previousIndex === event.currentIndex) return;
    const ordered = [...this.activeCategories];
    moveItemInArray(ordered, event.previousIndex, event.currentIndex);
    this.saveCategoryOrder(ordered.map(c => c.id));
  }

  // Delete category confirmation
  deleteCategoryId = signal<string | null>(null);
  deleteLoading = signal(false);

  // Category row menu (⋮)
  openMenuCategoryId = signal<string | null>(null);

  toggleMenu(id: string): void {
    this.openMenuCategoryId.update(current => current === id ? null : id);
  }

  closeMenu(): void {
    this.openMenuCategoryId.set(null);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  getSpentPct(cat: BudgetCategory): number {
    if (cat.assigned <= 0) return 0;
    return Math.min((cat.spent / cat.assigned) * 100, 100);
  }

  // ── Icono por categoría (lucide) ───────────────────────────────────────────
  // Mapa { categoryId → nombre kebab del icono }, persistido en localStorage por
  // ciclo. Se renderiza con <lucide-icon [img]="iconDataFor(id)">.
  readonly iconGroups = CATEGORY_ICON_GROUPS;
  private readonly categoryIcons = signal<Record<string, string>>({});
  readonly iconPickerCategoryId = signal<string | null>(null);

  private iconsStorageKey(): string | null {
    const id = this.cycle()?.id;
    return id ? `budget:catIcons:${id}` : null;
  }

  private loadCategoryIcons(): void {
    const key = this.iconsStorageKey();
    if (!key) { this.categoryIcons.set({}); return; }
    try {
      const raw = localStorage.getItem(key);
      this.categoryIcons.set(raw ? JSON.parse(raw) : {});
    } catch {
      this.categoryIcons.set({});
    }
  }

  iconDataFor(categoryId: string): LucideIconData {
    return getCategoryIconData(this.categoryIcons()[categoryId]);
  }

  selectedIconName(categoryId: string): string {
    return this.categoryIcons()[categoryId] ?? DEFAULT_CATEGORY_ICON;
  }

  openIconPicker(categoryId: string): void {
    this.iconPickerCategoryId.set(categoryId);
  }

  closeIconPicker(): void {
    this.iconPickerCategoryId.set(null);
  }

  selectIcon(name: string): void {
    const id = this.iconPickerCategoryId();
    if (!id) return;
    const next = { ...this.categoryIcons(), [id]: name };
    this.categoryIcons.set(next);
    const key = this.iconsStorageKey();
    if (key) {
      try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* sin persistencia disponible */ }
    }
    this.closeIconPicker();
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', maximumFractionDigits: 0,
    }).format(amount);
  }

  formatCompact(amount: number): string {
    const abs = Math.abs(amount);
    const prefix = amount < 0 ? '-$' : '$';
    if (abs >= 1_000_000) {
      return `${prefix}${(abs / 1_000_000).toFixed(2)}M`;
    }
    if (abs >= 1_000) {
      return `${prefix}${(abs / 1_000).toFixed(2)}K`;
    }
    return `${prefix}${abs.toFixed(0)}`;
  }

  // ── New transaction modal ──────────────────────────────────────────────────

  openTxForm(categoryId?: string | null, type: 'expense' | 'income' = 'expense'): void {
    this.txForm = {
      ...EMPTY_TX_FORM,
      date: new Date().toISOString().split('T')[0],
      type,
      budgetCategoryId: type === 'expense' && categoryId ? +categoryId : null,
    };
    this.payFullRemaining = false;
    this.txFormError.set(null);
    this.showTxForm.set(true);
  }

  closeTxForm(): void {
    this.showTxForm.set(false);
    this.txFormError.set(null);
  }

  onTxTypeChange(): void {
    this.txForm.budgetCategoryId = null;
    this.txForm.incomeType = '';
    this.payFullRemaining = false;
  }

  // Recalcula el monto si "pagar todo" sigue activo al cambiar de categoría
  onTxCategoryChange(): void {
    const cat = this.selectedTxCategory;
    if (this.payFullRemaining && (!cat || cat.available <= 0)) {
      this.payFullRemaining = false;
    } else if (this.payFullRemaining) {
      this.applyPayFull();
    }
  }

  onPayFullToggle(): void {
    if (this.payFullRemaining) this.applyPayFull();
  }

  private applyPayFull(): void {
    const cat = this.selectedTxCategory;
    this.txForm.amount = cat ? Math.max(0, cat.available) : null;
  }

  async saveTxForm(): Promise<void> {
    const isExpense = this.txForm.type === 'expense';
    // La fecha siempre es la actual: el modal ya no la pide.
    this.txForm.date = new Date().toISOString().split('T')[0];
    if (!this.txForm.amount) return;
    if (isExpense && !this.txForm.budgetCategoryId) return;
    if (!isExpense && !this.txForm.incomeType) return;

    this.txFormLoading.set(true);
    this.txFormError.set(null);
    try {
      await this.txService.add(this.txForm);
      this.closeTxForm();
      await this.budgetService.loadActiveCycle();
    } catch (err: unknown) {
      this.txFormError.set(err instanceof Error ? err.message : 'Error al guardar el movimiento');
    } finally {
      this.txFormLoading.set(false);
    }
  }

  // ── Disparo manual del ciclo ("Iniciar ciclo") ─────────────────────────────

  // Punto de entrada desde los botones. Si ya hay un ciclo activo, pide
  // confirmación (iniciar uno nuevo cierra el actual); si no, arranca directo.
  onStartCycleClick(): void {
    this.startError.set(null);
    if (this.cycle()) {
      this.showStartConfirm.set(true);
    } else {
      this.startCycle();
    }
  }

  cancelStartCycle(): void {
    this.showStartConfirm.set(false);
  }

  async startCycle(): Promise<void> {
    this.startingCycle.set(true);
    this.startError.set(null);
    try {
      await this.budgetService.startNewCycle();
      this.showStartConfirm.set(false);
      // El nuevo ciclo tiene otro id: recarga movimientos (arrancan en 0),
      // más el orden e iconos guardados por ciclo.
      await this.txService.loadAll();
      this.loadCategoryOrder();
      this.loadCategoryIcons();
    } catch (err: unknown) {
      this.startError.set(err instanceof Error ? err.message : 'No se pudo iniciar el ciclo');
    } finally {
      this.startingCycle.set(false);
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

  confirmDeleteCategory(id: string): void {
    this.deleteCategoryId.set(id);
  }

  cancelDeleteCategory(): void {
    this.deleteCategoryId.set(null);
  }

  async doDeleteCategory(): Promise<void> {
    const id = this.deleteCategoryId();
    if (!id) return;
    this.deleteLoading.set(true);
    try {
      await this.budgetService.deleteCategory(id);
      this.deleteCategoryId.set(null);
    } finally {
      this.deleteLoading.set(false);
    }
  }

  goToConfig(): void {
    this.router.navigate(['/budget/config']);
  }

  goToProjection(): void {
    this.router.navigate(['/budget/projection']);
  }
}
