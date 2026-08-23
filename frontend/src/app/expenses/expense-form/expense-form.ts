import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { switchMap } from 'rxjs';

import { ApiErrorResponse } from '../../shared/api-error.model';
import { ExpensesService } from '../expenses.service';
import { Category, Expense } from '../models/expense.models';

const NEW_CATEGORY_VALUE = '__new__';
const DEFAULT_NEW_CATEGORY_COLOR = '#4285f4';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

@Component({
  selector: 'app-expense-form',
  imports: [ReactiveFormsModule],
  templateUrl: './expense-form.html',
  styleUrl: './expense-form.scss',
})
export class ExpenseForm {
  private readonly fb = inject(FormBuilder);
  private readonly expensesService = inject(ExpensesService);

  readonly categories = input.required<Category[]>();
  readonly expenseAdded = output<Expense>();
  readonly categoryCreated = output<Category>();

  readonly newCategoryValue = NEW_CATEGORY_VALUE;

  readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(255)]],
    amount: this.fb.control<number | null>(null, [Validators.required, Validators.min(0.01)]),
    date: [todayIso(), [Validators.required]],
    categoryId: ['', [Validators.required]],
    newCategoryName: [''],
    newCategoryColor: [DEFAULT_NEW_CATEGORY_COLOR],
  });

  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  get isNewCategory(): boolean {
    return this.form.controls.categoryId.value === NEW_CATEGORY_VALUE;
  }

  submit(): void {
    if (this.isNewCategory) {
      this.form.controls.newCategoryName.addValidators(Validators.required);
    } else {
      this.form.controls.newCategoryName.clearValidators();
    }
    this.form.controls.newCategoryName.updateValueAndValidity();

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    this.submitting.set(true);
    this.errorMessage.set(null);

    const createExpense = (categoryId: number) =>
      this.expensesService.createExpense({
        title: raw.title,
        amount: raw.amount!,
        date: raw.date,
        category_id: categoryId,
      });

    const request$ = this.isNewCategory
      ? this.expensesService
          .createCategory({ name: raw.newCategoryName, color: raw.newCategoryColor })
          .pipe(
            switchMap((category) => {
              this.categoryCreated.emit(category);
              return createExpense(category.id);
            }),
          )
      : createExpense(Number(raw.categoryId));

    request$.subscribe({
      next: (expense) => {
        this.submitting.set(false);
        this.expenseAdded.emit(expense);
        this.resetForm();
      },
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);
        this.errorMessage.set(
          (err.error as ApiErrorResponse)?.detail ?? 'Не удалось добавить расход',
        );
      },
    });
  }

  private resetForm(): void {
    this.form.reset({
      title: '',
      amount: null,
      date: todayIso(),
      categoryId: '',
      newCategoryName: '',
      newCategoryColor: DEFAULT_NEW_CATEGORY_COLOR,
    });
  }
}
