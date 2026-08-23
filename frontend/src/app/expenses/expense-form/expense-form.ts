import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ApiErrorResponse } from '../../shared/api-error.model';
import { TranslatePipe } from '../../shared/i18n/translate.pipe';
import { TranslateService } from '../../shared/i18n/translate.service';
import { isoDate } from '../../shared/period';
import { CategoryPicker } from '../category-picker/category-picker';
import { ExpensesService } from '../expenses.service';
import { Category, Expense } from '../models/expense.models';

function todayIso(): string {
  return isoDate(new Date());
}

@Component({
  selector: 'app-expense-form',
  imports: [ReactiveFormsModule, CategoryPicker, TranslatePipe],
  templateUrl: './expense-form.html',
  styleUrl: './expense-form.scss',
})
export class ExpenseForm {
  private readonly fb = inject(FormBuilder);
  private readonly expensesService = inject(ExpensesService);
  private readonly translateService = inject(TranslateService);

  readonly categories = input.required<Category[]>();
  readonly expenseAdded = output<Expense>();
  readonly categoryCreated = output<Category>();
  readonly categoryDeleted = output<number>();

  readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(255)]],
    amount: this.fb.control<number | null>(null, [Validators.required, Validators.min(0.01)]),
    date: [todayIso(), [Validators.required]],
  });

  readonly selectedCategoryId = signal<number | null>(null);
  readonly categoryTouched = signal(false);
  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  onCategoryDeleted(id: number): void {
    if (this.selectedCategoryId() === id) {
      this.selectedCategoryId.set(null);
    }
    this.categoryDeleted.emit(id);
  }

  submit(): void {
    this.categoryTouched.set(true);

    if (this.form.invalid || this.selectedCategoryId() === null) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    this.submitting.set(true);
    this.errorMessage.set(null);

    this.expensesService
      .createExpense({
        title: raw.title,
        amount: raw.amount!,
        date: raw.date,
        category_id: this.selectedCategoryId()!,
      })
      .subscribe({
        next: (expense) => {
          this.submitting.set(false);
          this.expenseAdded.emit(expense);
          this.resetForm();
        },
        error: (err: HttpErrorResponse) => {
          this.submitting.set(false);
          this.errorMessage.set(
            (err.error as ApiErrorResponse)?.detail ??
              this.translateService.translate('expenseForm.genericError'),
          );
        },
      });
  }

  private resetForm(): void {
    this.form.reset({
      title: '',
      amount: null,
      date: todayIso(),
    });
    this.selectedCategoryId.set(null);
    this.categoryTouched.set(false);
  }
}
