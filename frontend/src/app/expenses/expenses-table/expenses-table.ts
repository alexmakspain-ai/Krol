import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ApiErrorResponse } from '../../shared/api-error.model';
import { TranslatePipe } from '../../shared/i18n/translate.pipe';
import { TranslateService } from '../../shared/i18n/translate.service';
import { PeriodPreset, isoDate, presetRange, startOfYear } from '../../shared/period';
import { PeriodFilter } from '../../shared/period-filter/period-filter';
import {
  CategoryTotal,
  aggregateByTopCategory,
  buildCategoriesById,
  resolveTopCategory,
} from '../category-aggregation';
import { CategoryPicker } from '../category-picker/category-picker';
import { ExpensesService } from '../expenses.service';
import { Category, Expense, ExpenseSortField, ExpenseUpdateRequest, SortOrder } from '../models/expense.models';

const PAGE_SIZE = 10;

@Component({
  selector: 'app-expenses-table',
  imports: [FormsModule, DecimalPipe, PeriodFilter, CategoryPicker, TranslatePipe],
  templateUrl: './expenses-table.html',
  styleUrl: './expenses-table.scss',
})
export class ExpensesTable implements OnInit {
  private readonly expensesService = inject(ExpensesService);
  private readonly translateService = inject(TranslateService);

  readonly categories = input.required<Category[]>();
  readonly categoryCreated = output<Category>();
  readonly categoryDeleted = output<number>();
  readonly expensesChanged = output<void>();

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
  readonly exporting = signal(false);

  readonly categoryTotals = signal<CategoryTotal[]>([]);
  readonly grandTotal = computed(() => this.categoryTotals().reduce((sum, t) => sum + t.total, 0));

  readonly subcategoryColumnExpanded = signal(false);

  readonly editingId = signal<number | null>(null);
  readonly editTitle = signal('');
  readonly editAmount = signal<number | null>(null);
  readonly editDate = signal('');
  readonly editCategoryId = signal<number | null>(null);

  private readonly categoriesMap = computed(() => buildCategoriesById(this.categories()));

  ngOnInit(): void {
    this.load();
    this.loadTotals();
  }

  reload(): void {
    this.page.set(0);
    this.load();
    this.loadTotals();
  }

  onPresetSelected(preset: PeriodPreset): void {
    this.preset.set(preset);
    this.page.set(0);
    this.load();
    this.loadTotals();
  }

  onCustomStartChanged(value: string): void {
    this.customStart.set(value);
    this.preset.set('custom');
    this.page.set(0);
    this.load();
    this.loadTotals();
  }

  onCustomEndChanged(value: string): void {
    this.customEnd.set(value);
    this.preset.set('custom');
    this.page.set(0);
    this.load();
    this.loadTotals();
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

  toggleSubcategoryColumn(): void {
    this.subcategoryColumnExpanded.update((v) => !v);
  }

  topCategoryOf(expense: Expense): Category {
    return resolveTopCategory(expense.category, this.categoriesMap());
  }

  subcategoryLabelOf(expense: Expense): string | null {
    return expense.category.parent_id === null ? null : expense.category.name;
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
        this.loadTotals();
        this.expensesChanged.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(
          (err.error as ApiErrorResponse)?.detail ??
            this.translateService.translate('expensesTable.saveError'),
        );
      },
    });
  }

  deleteExpense(expense: Expense): void {
    if (
      !confirm(this.translateService.translate('expensesTable.deleteConfirm', { title: expense.title }))
    ) {
      return;
    }

    this.expensesService.deleteExpense(expense.id).subscribe({
      next: () => {
        this.expenses.update((list) => list.filter((e) => e.id !== expense.id));
        this.loadTotals();
        this.expensesChanged.emit();
      },
      error: () => {
        this.errorMessage.set(this.translateService.translate('expensesTable.deleteError'));
      },
    });
  }

  exportCsv(): void {
    this.exportFile('csv');
  }

  exportXlsx(): void {
    this.exportFile('xlsx');
  }

  private exportFile(format: 'csv' | 'xlsx'): void {
    const range = presetRange(this.preset(), { start: this.customStart(), end: this.customEnd() });
    this.exporting.set(true);
    this.errorMessage.set(null);

    this.expensesService.exportExpenses(format, range, this.sortBy(), this.sortOrder()).subscribe({
      next: (blob) => {
        this.exporting.set(false);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `expenses_${range.start}_${range.end}.${format}`;
        link.click();
        URL.revokeObjectURL(url);
      },
      error: () => {
        this.exporting.set(false);
        this.errorMessage.set(this.translateService.translate('expensesTable.exportError'));
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
          this.errorMessage.set(this.translateService.translate('expensesTable.loadError'));
        },
      });
  }

  private loadTotals(): void {
    const range = presetRange(this.preset(), { start: this.customStart(), end: this.customEnd() });
    this.expensesService.listAllExpenses(range).subscribe({
      next: (expenses) => {
        this.categoryTotals.set(aggregateByTopCategory(expenses, this.categoriesMap()));
      },
      error: () => {
        // Footer totals are a secondary view; a failure here doesn't block the main table.
      },
    });
  }
}
