export type TransactionType = 'income' | 'expense';

export const INCOME_TYPES: { value: string; label: string }[] = [
  { value: 'Salario', label: 'Salario' },
  { value: 'Freelance', label: 'Freelance' },
  { value: 'Inversión', label: 'Inversión' },
  { value: 'Regalo', label: 'Regalo' },
  { value: 'Otro', label: 'Otro' },
];

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  date: string;
  budgetCategoryId: number | null;
  accountId: number | null;
  categoryName: string;
  description?: string;
  createdAt: string;
}

export interface TransactionForm {
  type: TransactionType;
  amount: number | null;
  date: string;
  budgetCategoryId: number | null;
  accountId: number | null;
  incomeType: string;
  description: string;
}

export interface TransactionFilter {
  type: TransactionType | 'all';
  budgetCategoryId: number | 'all';
  accountId: number | 'all';
  dateFrom: string;
  dateTo: string;
}
