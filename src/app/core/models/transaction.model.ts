export type TransactionType = 'income' | 'expense';

export type TransactionCategory =
  // Ingresos
  | 'salary' | 'freelance' | 'investment' | 'gift' | 'other'
  // Egresos
  | 'arriendo' | 'mercado' | 'servicios' | 'datos'
  | 'spotify_youtube' | 'plan_complementario' | 'transportes'
  | 'gastos_andres' | 'piano' | 'ahorro' | 'techo' | 'ayuda_mama';

export const INCOME_CATEGORIES: TransactionCategory[] = [
  'salary', 'freelance', 'investment', 'gift', 'other',
];

export const EXPENSE_CATEGORIES: TransactionCategory[] = [
  'arriendo', 'mercado', 'servicios', 'datos', 'spotify_youtube',
  'plan_complementario', 'transportes', 'gastos_andres', 'piano',
  'ahorro', 'techo', 'ayuda_mama',
];

export const ALL_CATEGORIES: TransactionCategory[] = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];

export const CATEGORY_LABELS: Record<TransactionCategory, string> = {
  salary: 'Salario',
  freelance: 'Freelance',
  investment: 'Inversión',
  gift: 'Regalo',
  other: 'Otro',
  arriendo: 'Arriendo',
  mercado: 'Mercado',
  servicios: 'Servicios',
  datos: 'Datos',
  spotify_youtube: 'Spotify/YouTube',
  plan_complementario: 'Plan complementario',
  transportes: 'Transportes',
  gastos_andres: 'Gastos Andrés',
  piano: 'Piano',
  ahorro: 'Ahorro',
  techo: 'Techo',
  ayuda_mama: 'Ayuda mamá',
};

export const CATEGORY_ICONS: Record<TransactionCategory, string> = {
  salary: '💼',
  freelance: '💻',
  investment: '📈',
  gift: '🎁',
  other: '📦',
  arriendo: '🏠',
  mercado: '🛒',
  servicios: '💡',
  datos: '📱',
  spotify_youtube: '🎵',
  plan_complementario: '🏥',
  transportes: '🚌',
  gastos_andres: '💳',
  piano: '🎹',
  ahorro: '🐷',
  techo: '🏗️',
  ayuda_mama: '❤️',
};

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  date: string;
  category: TransactionCategory;
  description?: string;
  createdAt: string;
}

export interface TransactionForm {
  type: TransactionType;
  amount: number | null;
  date: string;
  category: TransactionCategory | '';
  description: string;
}

export interface TransactionFilter {
  type: TransactionType | 'all';
  category: TransactionCategory | 'all';
  dateFrom: string;
  dateTo: string;
}
