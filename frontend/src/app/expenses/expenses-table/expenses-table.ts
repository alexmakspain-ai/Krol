import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ApiErrorResponse } from '../../shared/api-error.model';
import { ExpensesService } from '../expenses.service';
import { Category, Expense, ExpenseSortField, ExpenseUpdateRequest, SortOrder } from '../models/expense.models';

type PeriodPreset = 'week' | 'month' | 'year' | 'custom';

const PAGE_SIZE = 10;

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function startOfWeek(date: Date): Date {
  const result = new Date(date);
  const day = (result.getDay() + 6) % 7;
  result.setDate(result.getDate() - day);
  return result;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfYear(date: Date): Date {
  return new Date(date.getFullYear(), 0, 1);
}

@Component({
  selector: 'app-expenses-table',
  imports: [FormsModule, DecimalPipe],
  templateUrl: './expenses-table.html',
  styleUrl: './expenses-table.scss',
})
export class ExpensesTable implements OnInit {
  private readonly expensesService = inject(ExpensesService);

  readonly categories = input.required<Category[]>();

  readonly preset = signal<PeriodPreset>('year');
  readonly customStart = signal(isoDate(startOfYear(new Date())));
  readonly customEnd = signal(isoDate(new Date()));

  readonly sortBy = signal<ExpenseSortField>('date');
  readonly sortOrder = signal<SortOrder>('desc');
  readonly page = signal(0);

  readonly expenses = signal<Expense[]>([]);
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly hasNextPage = signal(false);

  readonly editingId = signal<number | null>(null);
  readonly editTitle = signal('');
  readonly editAmount = signal<number | null>(null);
  readonly editDate = signal('');
  readonly editCategoryId = signal<number | null>(null);

  private readonly range = computed<{ start: string; end: string }>(() => {
    const today = new Date();
    switch (this.preset()) {
      case 'week':
        return { start: isoDate(startOfWeek(today)), end: isoDate(today) };
      case 'month':
        return { start: isoDate(startOfMonth(today)), end: isoDate(today) };
      case 'year':
        return { start: isoDate(startOfYear(today)), end: isoDate(today) };
      case 'custom':
        return { start: this.customStart(), end: this.customEnd() };
    }
  });

  ngOnInit(): void {
    this.load();
  }

  reload(): void {
    this.page.set(0);
    this.load();
  }

  setPreset(preset: PeriodPreset): void {
    this.preset.set(preset);
    this.page.set(0);
    this.load();
  }

  applyCustomRange(): void {
    this.preset.set('custom');
    this.page.set(0);
    this.load();
  }

  sortByField(field: ExpenseSortField): void {
    if (this.sortBy() === field) {
      this.sortOrder.set(this.sortOrder() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortBy.set(field);
      this.sortOrder.set('asc');
    }
    this.page.set(0);
    this.load();
  }

  nextPage(): void {
    if (!this.hasNextPage()) {
      return;
    }
    this.page.update((p) => p + 1);
    this.load();
  }

  prevPage(): void {
    if (this.page() === 0) {
      return;
    }
    this.page.update((p) => p - 1);
    this.load();
  }

  startEdit(expense: Expense): void {
    this.editingId.set(expense.id);
    this.editTitle.set(expense.title);
    this.editAmount.set(expense.amount);
    this.editDate.set(expense.date);
    this.editCategoryId.set(expense.category.id);
  }

  cancelEdit(): void {
    this.editingId.set(null);
  }

  saveEdit(expense: Expense): void {
    const categoryId = this.editCategoryId();
    const amount = this.editAmount();
    const title = this.editTitle().trim();
    const date = this.editDate();

    if (!title || amount === null || amount <= 0 || !date || categoryId === null) {
      return;
    }

    const payload: ExpenseUpdateRequest = { title, amount, date, category_id: categoryId };

    this.expensesService.updateExpense(expense.id, payload).subscribe({
      next: (updated) => {
        this.expenses.update((list) => list.map((e) => (e.id === updated.id ? updated : e)));
        this.editingId.set(null);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(
          (err.error as ApiErrorResponse)?.detail ?? 'Не удалось сохранить изменения',
        );
      },
    });
  }

  deleteExpense(expense: Expense): void {
    if (!confirm(`Удалить расход «${expense.title}»?`)) {
      return;
    }

    this.expensesService.deleteExpense(expense.id).subscribe({
      next: () => {
        this.expenses.update((list) => list.filter((e) => e.id !== expense.id));
      },
      error: () => {
        this.errorMessage.set('Не удалось удалить расход');
      },
    });
  }

  private load(): void {
    const { start, end } = this.range();
    this.loading.set(true);
    this.errorMessage.set(null);

    this.expensesService
      .listExpenses({
        start_date: start,
        end_date: end,
        sort_by: this.sortBy(),
        order: this.sortOrder(),
        skip: this.page() * PAGE_SIZE,
        limit: PAGE_SIZE,
      })
      .subscribe({
        next: (expenses) => {
          this.loading.set(false);
          this.expenses.set(expenses);
          this.hasNextPage.set(expenses.length === PAGE_SIZE);
        },
        error: () => {
          this.loading.set(false);
          this.errorMessage.set('Не удалось загрузить расходы');
        },
      });
  }
}
