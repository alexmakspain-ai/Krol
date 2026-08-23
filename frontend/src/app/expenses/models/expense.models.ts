export interface Category {
  id: number;
  name: string;
  color: string;
  parent_id: number | null;
}

export interface CategoryCreateRequest {
  name: string;
  color: string;
  parent_id: number | null;
}

export interface Expense {
  id: number;
  title: string;
  amount: number;
  date: string;
  created_at: string;
  category: Category;
}

export interface ExpenseCreateRequest {
  title: string;
  amount: number;
  date: string;
  category_id: number;
}

export type ExpenseUpdateRequest = ExpenseCreateRequest;

export type ExpenseSortField = 'date' | 'amount' | 'title' | 'category';
export type SortOrder = 'asc' | 'desc';

export interface ExpensesQuery {
  start_date?: string;
  end_date?: string;
  sort_by?: ExpenseSortField;
  order?: SortOrder;
  skip?: number;
  limit?: number;
}
