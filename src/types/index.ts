export type Currency = 'AED' | 'INR' | 'USD';

export interface BankAccount {
  id: string;
  name: string;
  bank_name: string;
  account_number: string;
  account_type: 'current' | 'savings' | 'credit_card';
  currency: string;
  color: string;
  icon: string;
  balance?: number;
  credit_limit?: number;
  payment_due_date?: string;
  minimum_payment?: number;
  created_at: string;
}

export interface Transaction {
  id: string;
  account_id: string;
  date: string;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
  category: string;
  sub_category?: string;
  is_fixed: boolean;
  custom_label?: string;
  reference?: string;
  raw_description?: string;
  created_at: string;
}

export interface ManualIncome {
  id: string;
  source_name: string;
  amount: number;
  frequency: 'one-time' | 'monthly' | 'weekly' | 'yearly';
  date: string;
  note?: string;
  currency: string;
  created_at: string;
}

export interface LifeGoal {
  id: string;
  title: string;
  description: string;
  vision_statement: string;
  target_year: number;
  status: 'active' | 'paused' | 'completed';
  created_at: string;
}

export interface GoalArea {
  id: string;
  life_goal_id: string;
  name: string;
  icon: string;
  color: string;
  priority_order: number;
  goals?: Goal[];
}

export interface Goal {
  id: string;
  area_id: string;
  title: string;
  description: string;
  target_date?: string;
  status: 'not_started' | 'in_progress' | 'done' | 'paused';
  priority: 'low' | 'medium' | 'high';
  linked_amount?: number;
  milestones?: Milestone[];
  created_at: string;
}

export interface Milestone {
  id: string;
  goal_id: string;
  title: string;
  description?: string;
  due_date?: string;
  status: 'not_started' | 'in_progress' | 'done';
  order_index: number;
  tasks?: Task[];
}

export interface Task {
  id: string;
  milestone_id: string;
  title: string;
  note?: string;
  due_date?: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
}

export interface PaymentDue {
  id: string;
  name: string;
  type: 'loan' | 'credit_card' | 'emi' | 'subscription' | 'other';
  amount: number;
  due_date: string;
  frequency: 'monthly' | 'quarterly' | 'yearly' | 'one-time';
  linked_account_id?: string;
  status: 'pending' | 'paid' | 'overdue';
  reminder_days_before: number;
  notes?: string;
  created_at: string;
}

export interface StatementColumnMap {
  date: string;
  description: string;
  debit?: string;
  credit?: string;
  amount?: string;
  balance?: string;
  reference?: string;
  value_date?: string;
}

export interface ParsedStatement {
  transactions: Omit<Transaction, 'id' | 'account_id' | 'created_at'>[];
  account_info?: {
    account_number?: string;
    currency?: string;
    period_from?: string;
    period_to?: string;
  };
}

export interface CurrencyRates {
  AED: number;
  INR: number;
  USD: number;
}

export interface MonthlyAnalysis {
  month: string;
  total_income: number;
  total_expense: number;
  fixed_expenses: number;
  variable_expenses: number;
  savings: number;
  categories: CategoryBreakdown[];
}

export interface CategoryBreakdown {
  category: string;
  amount: number;
  count: number;
  is_fixed: boolean;
  percentage: number;
}
