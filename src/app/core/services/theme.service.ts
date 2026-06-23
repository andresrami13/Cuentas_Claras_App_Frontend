import { Injectable, signal } from '@angular/core';

export interface AppTheme {
  id: string;
  name: string;
  description: string;
  emoji: string;
  /** Colores para la tarjeta de vista previa en Ajustes */
  preview: {
    gradient: string;
    accent: string;
    /** Triplete RGB para el "tinta" del mock interno (claro u oscuro según el tema) */
    ink: string;
  };
}

export const APP_THEMES: AppTheme[] = [
  {
    id: 'ocean',
    name: 'Océano',
    description: 'Azul profundo y cian: el clásico de confianza',
    emoji: '🌊',
    preview: {
      gradient: 'linear-gradient(135deg, #1A3A6E 0%, #2563B0 50%, #06B6D4 100%)',
      accent: '#22D3EE',
      ink: '255 255 255',
    },
  },
  {
    id: 'emerald',
    name: 'Esmeralda',
    description: 'Verdes de crecimiento: dinero fresco',
    emoji: '🌿',
    preview: {
      gradient: 'linear-gradient(135deg, #064E3B 0%, #0F766E 50%, #10B981 100%)',
      accent: '#34D399',
      ink: '255 255 255',
    },
  },
  {
    id: 'midnight',
    name: 'Medianoche',
    description: 'Oscuro y violeta: minimalista premium',
    emoji: '🌌',
    preview: {
      gradient: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 50%, #4338CA 100%)',
      accent: '#A78BFA',
      ink: '255 255 255',
    },
  },
  {
    id: 'sunset',
    name: 'Atardecer',
    description: 'Púrpura y ámbar: cálido y diferente',
    emoji: '🌅',
    preview: {
      gradient: 'linear-gradient(135deg, #581C87 0%, #9D174D 50%, #F59E0B 100%)',
      accent: '#FBBF24',
      ink: '255 255 255',
    },
  },
  {
    id: 'ocean-light',
    name: 'Océano claro',
    description: 'Fondo blanco con barra azul océano: lectura cómoda',
    emoji: '🌊',
    preview: {
      gradient: 'linear-gradient(135deg, #ffffff 0%, #eaf1fb 100%)',
      accent: '#06B6D4',
      ink: '15 31 56',
    },
  },
  {
    id: 'emerald-light',
    name: 'Esmeralda claro',
    description: 'Fondo blanco con barra verde esmeralda',
    emoji: '🌿',
    preview: {
      gradient: 'linear-gradient(135deg, #ffffff 0%, #e7f6ef 100%)',
      accent: '#10B981',
      ink: '6 46 35',
    },
  },
  {
    id: 'midnight-light',
    name: 'Medianoche claro',
    description: 'Fondo blanco con barra violeta de medianoche',
    emoji: '🌌',
    preview: {
      gradient: 'linear-gradient(135deg, #ffffff 0%, #efeefb 100%)',
      accent: '#7C3AED',
      ink: '23 21 51',
    },
  },
  {
    id: 'sunset-light',
    name: 'Atardecer claro',
    description: 'Fondo blanco con barra de atardecer',
    emoji: '🌅',
    preview: {
      gradient: 'linear-gradient(135deg, #ffffff 0%, #fbeede 100%)',
      accent: '#F59E0B',
      ink: '60 22 66',
    },
  },
];

const STORAGE_KEY = 'spendcount_theme';
const DEFAULT_THEME = 'ocean';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly themes = APP_THEMES;

  private readonly _current = signal<string>(this.loadSaved());
  readonly current = this._current.asReadonly();

  constructor() {
    this.applyToBody(this._current());
  }

  select(id: string): void {
    if (!this.themes.some(t => t.id === id)) return;
    this._current.set(id);
    this.applyToBody(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch { /* sin almacenamiento: el tema aplica solo para esta sesión */ }
  }

  private loadSaved(): string {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved && APP_THEMES.some(t => t.id === saved) ? saved : DEFAULT_THEME;
    } catch {
      return DEFAULT_THEME;
    }
  }

  private applyToBody(id: string): void {
    const body = document.body;
    for (const t of this.themes) body.classList.remove(`theme-${t.id}`);
    body.classList.add(`theme-${id}`);
    // Marcador genérico para los ajustes de contraste de las variantes claras.
    body.classList.toggle('theme-light', id.endsWith('-light'));
  }
}
