export type TransactionType = 'income' | 'expense';

export type TransactionCategory =
  | 'salary' | 'freelance' | 'investment' | 'gift'
  | 'food' | 'transport' | 'housing' | 'health'
  | 'entertainment' | 'education' | 'shopping' | 'other';

export const INCOME_CATEGORIES: TransactionCategory[] = ['salary', 'freelance', 'investment', 'gift'];
export const EXPENSE_CATEGORIES: TransactionCategory[] = ['food', 'transport', 'housing', 'health', 'entertainment', 'education', 'shopping', 'other'];
export const ALL_CATEGORIES: TransactionCategory[] = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];

export const CATEGORY_LABELS: Record<TransactionCategory, string> = {
  salary: 'Salario',
  freelance: 'Freelance',
  investment: 'Inversión',
  gift: 'Regalo',
  food: 'Alimentación',
  transport: 'Transporte',
  housing: 'Vivienda',
  health: 'Salud',
  entertainment: 'Entretenimiento',
  education: 'Educación',
  shopping: 'Compras',
  other: 'Otros',
};

export const CATEGORY_ICONS: Record<TransactionCategory, string> = {
  salary: '💼',
  freelance: '💻',
  investment: '📈',
  gift: '🎁',
  food: '🍽️',
  transport: '🚌',
  housing: '🏠',
  health: '⚕️',
  entertainment: '🎬',
  education: '📚',
  shopping: '🛍️',
  other: '📦',
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
