import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../shared/api-config';
import {
  Category,
  CategoryCreateRequest,
  Expense,
  ExpenseCreateRequest,
  ExpenseUpdateRequest,
  ExpensesQuery,
} from './models/expense.models';

@Injectable({ providedIn: 'root' })
export class ExpensesService {
  private readonly http = inject(HttpClient);

  listCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${API_BASE_URL}/categories`);
  }

  createCategory(payload: CategoryCreateRequest): Observable<Category> {
    return this.http.post<Category>(`${API_BASE_URL}/categories`, payload);
  }

  listExpenses(query: ExpensesQuery): Observable<Expense[]> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }
    return this.http.get<Expense[]>(`${API_BASE_URL}/expenses`, { params });
  }

  createExpense(payload: ExpenseCreateRequest): Observable<Expense> {
    return this.http.post<Expense>(`${API_BASE_URL}/expenses`, payload);
  }

  updateExpense(id: number, payload: ExpenseUpdateRequest): Observable<Expense> {
    return this.http.put<Expense>(`${API_BASE_URL}/expenses/${id}`, payload);
  }

  deleteExpense(id: number): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/expenses/${id}`);
  }
}
