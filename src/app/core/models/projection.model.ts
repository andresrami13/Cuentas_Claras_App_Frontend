// Proyección del próximo mes: simulación 100% del lado del cliente.
// No modifica el ciclo activo ni ningún dato del backend.

export type ProjectionKind = 'commitment' | 'expense';
export type ProjectionSource = 'template' | 'history' | 'manual';

export const PROJECTION_SOURCE_LABELS: Record<ProjectionSource, string> = {
  template: 'Plantilla',
  history: 'Histórico',
  manual: 'Manual',
};

export interface ProjectionItem {
  name: string;
  amount: number | null;
  kind: ProjectionKind;
  source: ProjectionSource;
}

export interface ProjectionState {
  expectedIncome: number | null;
  items: ProjectionItem[];
}
