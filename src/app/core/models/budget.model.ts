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
  nextPayDate: string;
  fixedCategories: FixedBudgetCategory[];
}

export interface CreateCycleForm {
  startDate: string;
  endDate: string;
}

export interface AddCategoryForm {
  name: string;
  assigned: number | null;
}
