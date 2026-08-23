import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, of, switchMap } from 'rxjs';

import { DateRange } from '../shared/period';
import { API_BASE_URL } from '../shared/api-config';
import {
  Category,
  CategoryCreateRequest,
  Expense,
  ExpenseCreateRequest,
  ExpenseSortField,
  ExpenseUpdateRequest,
  ExpensesQuery,
  SortOrder,
} from './models/expense.models';

const MAX_PAGE_SIZE = 200;

@Injectable({ providedIn: 'root' })
export class ExpensesService {
  private readonly http = inject(HttpClient);

  listCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${API_BASE_URL}/categories`);
  }

  createCategory(payload: CategoryCreateRequest): Observable<Category> {
    return this.http.post<Category>(`${API_BASE_URL}/categories`, payload);
  }

  deleteCategory(id: number): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/categories/${id}`);
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

  /**
   * Fetches every expense in the given date range by walking backend pages
   * (capped at MAX_PAGE_SIZE per request) — used to aggregate totals for the
   * chart widget, since the backend has no dedicated aggregation endpoint.
   */
  listAllExpenses(range: DateRange): Observable<Expense[]> {
    const fetchPage = (skip: number): Observable<Expense[]> =>
      this.listExpenses({
        start_date: range.start,
        end_date: range.end,
        limit: MAX_PAGE_SIZE,
        skip,
      }).pipe(
        switchMap((page) =>
          page.length === MAX_PAGE_SIZE
            ? fetchPage(skip + MAX_PAGE_SIZE).pipe(map((rest) => [...page, ...rest]))
            : of(page),
        ),
      );

    return fetchPage(0);
  }

  exportExpenses(
    format: 'csv' | 'xlsx',
    range: DateRange,
    sortBy: ExpenseSortField,
    order: SortOrder,
  ): Observable<Blob> {
    const params = new HttpParams()
      .set('start_date', range.start)
      .set('end_date', range.end)
      .set('sort_by', sortBy)
      .set('order', order);

    return this.http.get(`${API_BASE_URL}/expenses/export/${format}`, {
      params,
      responseType: 'blob',
    });
  }
}
