import { Component, OnInit, inject, signal, viewChild } from '@angular/core';

import { ExpensesChart } from '../../charts/expenses-chart/expenses-chart';
import { ExpenseForm } from '../expense-form/expense-form';
import { ExpensesTable } from '../expenses-table/expenses-table';
import { ExpensesService } from '../expenses.service';
import { Category } from '../models/expense.models';

@Component({
  selector: 'app-expenses-page',
  imports: [ExpenseForm, ExpensesTable, ExpensesChart],
  templateUrl: './expenses-page.html',
  styleUrl: './expenses-page.scss',
})
export class ExpensesPage implements OnInit {
  private readonly expensesService = inject(ExpensesService);

  readonly categories = signal<Category[]>([]);
  private readonly table = viewChild(ExpensesTable);
  private readonly chart = viewChild(ExpensesChart);

  ngOnInit(): void {
    this.expensesService.listCategories().subscribe((categories) => this.categories.set(categories));
  }

  onExpenseAdded(): void {
    this.table()?.reload();
    this.chart()?.reload();
  }

  onCategoryCreated(category: Category): void {
    this.categories.update((list) => [...list, category]);
  }

  onCategoryDeleted(id: number): void {
    this.categories.update((list) => list.filter((c) => c.id !== id && c.parent_id !== id));
  }
}
