import { Component, input, signal, viewChild } from '@angular/core';

import { Category } from '../../expenses/models/expense.models';
import { TranslatePipe } from '../../shared/i18n/translate.pipe';
import { previousMonthRange } from '../../shared/period';
import { SingleExpensesChart } from '../single-expenses-chart/single-expenses-chart';

@Component({
  selector: 'app-expenses-chart',
  imports: [SingleExpensesChart, TranslatePipe],
  templateUrl: './expenses-chart.html',
  styleUrl: './expenses-chart.scss',
})
export class ExpensesChart {
  readonly categories = input.required<Category[]>();

  readonly comparisonVisible = signal(false);
  readonly comparisonInitialRange = previousMonthRange();

  private readonly mainChart = viewChild<SingleExpensesChart>('mainChart');
  private readonly comparisonChart = viewChild<SingleExpensesChart>('comparisonChart');

  toggleComparison(): void {
    this.comparisonVisible.update((v) => !v);
  }

  reload(): void {
    this.mainChart()?.reload();
    this.comparisonChart()?.reload();
  }
}
