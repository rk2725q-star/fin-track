export interface FinancerConfig {
  takeout_method: 'fixed' | 'percentage';
  takeout_value: number;
  repay_method: 'fixed' | 'multiplier';
  repay_value: number;
  penalty_enabled: boolean;
  early_closure_allowed: boolean;
  default_payment_frequency: 'daily' | 'weekly' | 'monthly';
}

export interface User {
  id: number;
  name: string;
  username: string;
  config: FinancerConfig;
}

export interface Customer {
  id: number;
  name: string;
  place: string;
  phone: string;
  preferred_frequency: 'daily' | 'weekly' | 'monthly';
  preferred_day: string;
  created_at: string;
}

export interface Loan {
  id: number;
  customer_id: number;
  customer_name?: string;
  asked_amount: number;
  takeout_amount: number;
  given_amount: number;
  total_repay: number;
  total_paid: number;
  balance: number;
  status: 'active' | 'closed';
  payment_type: 'daily' | 'weekly' | 'monthly';
  start_date: string;
  close_date?: string;
}

export interface Expense {
  id: number;
  amount: number;
  description: string;
  expense_date: string;
}

export interface Payment {
  id: number;
  loan_id: number;
  customer_name?: string;
  amount: number;
  payment_date: string;
}

export interface DashboardData {
  overall: {
    active_loans: number;
    closed_loans: number;
    total_given: number;
    total_expected: number;
    total_collected: number;
    total_pending: number;
    total_profit_potential: number;
  };
  period: {
    collected: number;
    expenses: number;
    net: number;
  };
  loansByType: {
    payment_type: string;
    count: number;
    pending: number;
  }[];
}

export interface CashbookData {
  opening_balance: number;
  collections: Payment[];
  disbursements: Loan[];
  expenses: Expense[];
}
