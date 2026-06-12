import { Component, input, output, signal } from '@angular/core';

export interface FabAction {
  id: string;
  label: string;
  emoji: string;
}

/**
 * Botón flotante expandible (speed-dial) para móvil: al tocarlo despliega
 * sus acciones hacia arriba con animación escalonada, cada una con
 * etiqueta + icono. Tocar afuera o volver a tocar el botón lo contrae.
 */
@Component({
  selector: 'app-fab-menu',
  template: `
    @if (open()) {
      <div class="md:hidden fixed inset-0 z-20 bg-black/20" (click)="open.set(false)"></div>
    }
    <!-- pointer-events-none: el contenedor no debe capturar toques sobre
         las opciones invisibles; solo el + y las opciones abiertas son táctiles -->
    <div class="md:hidden fixed bottom-20 right-4 z-30 flex flex-col items-end gap-3 pointer-events-none">
      @for (a of actions(); track a.id; let i = $index) {
        <div
          class="flex items-center gap-2.5 transition-all duration-200 ease-out"
          [class]="open()
            ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
            : 'opacity-0 translate-y-3 scale-75 pointer-events-none'"
          [style.transitionDelay.ms]="open() ? (actions().length - 1 - i) * 50 : 0"
        >
          <span class="bg-surface/95 text-white text-xs font-semibold px-3 py-1.5 rounded-full border border-white/15 shadow-lg whitespace-nowrap">
            {{ a.label }}
          </span>
          <button
            type="button"
            (click)="pick(a.id)"
            class="w-11 h-11 rounded-full bg-white/15 backdrop-blur-xl border border-white/25 shadow-lg flex items-center justify-center text-xl active:scale-90 transition-transform"
          >
            {{ a.emoji }}
          </button>
        </div>
      }
      <button
        type="button"
        (click)="open.update(v => !v)"
        title="Acciones"
        class="pointer-events-auto w-14 h-14 rounded-full bg-accent-400 text-on-accent shadow-lg shadow-accent-500/30 flex items-center justify-center hover:bg-accent-300 transition-all duration-200 active:scale-95"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="w-7 h-7 transition-transform duration-200"
          [class.rotate-45]="open()"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
        </svg>
      </button>
    </div>
  `,
})
export class FabMenuComponent {
  actions = input.required<FabAction[]>();
  action = output<string>();

  open = signal(false);

  pick(id: string): void {
    this.open.set(false);
    this.action.emit(id);
  }
}
