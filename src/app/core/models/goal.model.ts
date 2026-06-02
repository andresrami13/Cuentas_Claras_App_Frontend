export interface FinancialGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  startDate: string;
  deadline: string;
  status: string;
  description?: string;
}

export interface AiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  goalId?: string;
  isLoading?: boolean;
}
