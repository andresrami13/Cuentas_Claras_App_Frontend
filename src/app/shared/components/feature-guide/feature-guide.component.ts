import { Component, OnInit, input, signal } from '@angular/core';

/**
 * Tarjeta de guía educativa reutilizable: se muestra la primera vez que el
 * usuario entra a una pantalla y puede reabrirse con un botón "?" del padre
 * (vía referencia de template: <app-feature-guide #guide /> ... guide.reopen()).
 */
@Component({
  selector: 'app-feature-guide',
  template: `
    @if (visible()) {
      <div class="bg-accent-400/10 border border-accent-400/30 rounded-2xl p-5 mb-5">
        <div class="flex items-start justify-between gap-3 mb-3">
          <h2 class="text-base font-bold text-ink">{{ icon() }} {{ title() }}</h2>
          <button (click)="dismiss()" class="text-ink/50 hover:text-ink text-xl leading-none flex-shrink-0">&times;</button>
        </div>
        <p class="text-sm text-ink/80 mb-4">{{ intro() }}</p>
        <div class="space-y-3">
          @for (step of steps(); track $index) {
            <div class="flex gap-3 items-start">
              <span class="w-6 h-6 rounded-full bg-accent-400/20 text-accent-300 text-xs font-bold flex items-center justify-center flex-shrink-0">{{ $index + 1 }}</span>
              <p class="text-sm text-ink/80">{{ step }}</p>
            </div>
          }
        </div>
        @if (note()) {
          <div class="mt-4 bg-veil/10 rounded-xl px-3 py-2.5 text-xs text-ink/70">{{ note() }}</div>
        }
        <button
          (click)="dismiss()"
          class="mt-4 w-full py-2.5 bg-accent-400/80 hover:bg-accent-300/90 text-on-accent font-semibold text-sm rounded-xl transition-all duration-200 active:scale-95"
        >
          ¡Entendido!
        </button>
      </div>
    }
  `,
})
export class FeatureGuideComponent implements OnInit {
  /** Identificador único de la pantalla; controla el "ya la vio" en localStorage. */
  storageKey = input.required<string>();
  icon = input('💡');
  title = input.required<string>();
  intro = input.required<string>();
  steps = input.required<string[]>();
  note = input('');

  visible = signal(false);

  private get key(): string {
    return `spendcount_guide_${this.storageKey()}`;
  }

  ngOnInit(): void {
    this.visible.set(!localStorage.getItem(this.key));
  }

  dismiss(): void {
    this.visible.set(false);
    localStorage.setItem(this.key, '1');
  }

  reopen(): void {
    this.visible.set(true);
  }
}
