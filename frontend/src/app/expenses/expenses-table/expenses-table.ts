import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ApiErrorResponse } from '../../shared/api-error.model';
import { PeriodFilter } from '../../shared/period-filter/period-filter';
import { PeriodPreset, isoDate, presetRange, startOfYear } from '../../shared/period';
import { CategoryPicker } from '../category-picker/category-picker';
import { ExpensesService } from '../expenses.service';
import { Category, Expense, ExpenseSortField, ExpenseUpdateRequest, SortOrder } from '../models/expense.models';

const PAGE_SIZE = 10;

@Component({
  selector: 'app-expenses-table',
  imports: [FormsModule, DecimalPipe, PeriodFilter, CategoryPicker],
  templateUrl: './expenses-table.html',
  styleUrl: './expenses-table.scss',
})
export class ExpensesTable implements OnInit {
  private readonly expensesService = inject(ExpensesService);

  readonly categories = input.required<Category[]>();
  readonly categoryCreated = output<Category>();
  readonly categoryDeleted = output<number>();

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

  ngOnInit(): void {
    this.load();
  }

  reload(): void {
    this.page.set(0);
    this.load();
  }

  onPresetSelected(preset: PeriodPreset): void {
    this.preset.set(preset);
    this.page.set(0);
    this.load();
  }

  onCustomStartChanged(value: string): void {
    this.customStart.set(value);
    this.preset.set('custom');
    this.page.set(0);
    this.load();
  }

  onCustomEndChanged(value: string): void {
    this.customEnd.set(value);
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

  onCategoryDeletedInEdit(id: number): void {
    if (this.editCategoryId() === id) {
      this.editCategoryId.set(null);
    }
    this.categoryDeleted.emit(id);
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
    const { start, end } = presetRange(this.preset(), { start: this.customStart(), end: this.customEnd() });
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
