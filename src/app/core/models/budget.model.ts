export type Periodicity = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';

export const PERIODICITY_LABELS: Record<Periodicity, string> = {
  WEEKLY: 'Semanal',
  BIWEEKLY: 'Quincenal',
  MONTHLY: 'Mensual',
};

export interface BudgetCycle {
  id: string;
  documentNumber: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'closed';
  categories: BudgetCategory[];
}

export interface BudgetCategory {
  id: string;
  name: string;
  assigned: number;
  spent: number;
  available: number;
}

export interface FixedBudgetCategory {
  name: string;
  amount: number;
}

export interface UserBudgetConfig {
  documentNumber: string;
  payDay: number;
  periodicity: Periodicity;
  nextPayDate: string;
  fixedCategories: FixedBudgetCategory[];
}

export interface CreateCycleForm {
  paymentDay: number;
  periodicity: Periodicity;
}

export interface AddCategoryForm {
  name: string;
  assigned: number | null;
}
