import { DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { ChartConfiguration, ChartData, ChartEvent } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

import { PeriodFilter } from '../../shared/period-filter/period-filter';
import { PeriodPreset, isoDate, presetRange, startOfMonth } from '../../shared/period';
import { Category, Expense } from '../../expenses/models/expense.models';
import { ExpensesService } from '../../expenses/expenses.service';

interface CategoryTotal {
  categoryId: number;
  name: string;
  color: string;
  total: number;
}

/** Only top-level categories appear on the chart — a subcategory's amount rolls up into its parent. */
function resolveTopCategory(category: Category, categoriesById: Map<number, Category>): Category {
  if (category.parent_id === null) {
    return category;
  }
  return categoriesById.get(category.parent_id) ?? category;
}

function aggregateByCategory(
  expenses: Expense[],
  categoriesById: Map<number, Category>,
): CategoryTotal[] {
  const totalsById = new Map<number, CategoryTotal>();

  for (const expense of expenses) {
    const topCategory = resolveTopCategory(expense.category, categoriesById);
    const existing = totalsById.get(topCategory.id);
    if (existing) {
      existing.total += expense.amount;
    } else {
      totalsById.set(topCategory.id, {
        categoryId: topCategory.id,
        name: topCategory.name,
        color: topCategory.color,
        total: expense.amount,
      });
    }
  }

  return [...totalsById.values()].sort((a, b) => b.total - a.total);
}

function formatDisplayDate(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${day}.${month}.${year}`;
}

@Component({
  selector: 'app-expenses-chart',
  imports: [PeriodFilter, BaseChartDirective, DecimalPipe],
  templateUrl: './expenses-chart.html',
  styleUrl: './expenses-chart.scss',
})
export class ExpensesChart implements OnInit {
  private readonly expensesService = inject(ExpensesService);

  readonly categories = input.required<Category[]>();

  readonly preset = signal<PeriodPreset>('month');
  readonly customStart = signal(isoDate(startOfMonth(new Date())));
  readonly customEnd = signal(isoDate(new Date()));

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly totals = signal<CategoryTotal[]>([]);
  readonly selectedIndex = signal<number | null>(null);
  readonly hoveredIndex = signal<number | null>(null);

  readonly totalAmount = computed(() => this.totals().reduce((sum, t) => sum + t.total, 0));

  readonly periodLabel = computed(() => {
    const range = presetRange(this.preset(), { start: this.customStart(), end: this.customEnd() });
    return `${formatDisplayDate(range.start)} – ${formatDisplayDate(range.end)}`;
  });

  /** No hover/selection → center shows the period total; hovering or clicking a segment shows that category instead. */
  readonly displayedIndex = computed(() => this.hoveredIndex() ?? this.selectedIndex());

  readonly centerCategory = computed<CategoryTotal | null>(() => {
    const index = this.displayedIndex();
    return index === null ? null : (this.totals()[index] ?? null);
  });

  readonly centerPercentage = computed(() => {
    const category = this.centerCategory();
    const total = this.totalAmount();
    return category && total > 0 ? (category.total / total) * 100 : 0;
  });

  readonly chartData = computed<ChartData<'doughnut'>>(() => ({
    labels: this.totals().map((t) => t.name),
    datasets: [
      {
        data: this.totals().map((t) => t.total),
        backgroundColor: this.totals().map((t) => t.color),
        borderWidth: 0,
      },
    ],
  }));

  readonly chartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '68%',
    plugins: {
      legend: { display: false },
    },
  };

  private readonly categoriesById = computed(() => new Map(this.categories().map((c) => [c.id, c])));

  ngOnInit(): void {
    this.load();
  }

  reload(): void {
    this.load();
  }

  onPresetSelected(preset: PeriodPreset): void {
    this.preset.set(preset);
    this.resetSelection();
    this.load();
  }

  onCustomStartChanged(value: string): void {
    this.customStart.set(value);
    this.preset.set('custom');
    this.resetSelection();
    this.load();
  }

  onCustomEndChanged(value: string): void {
    this.customEnd.set(value);
    this.preset.set('custom');
    this.resetSelection();
    this.load();
  }

  onChartHover(event: { event?: ChartEvent; active?: object[] }): void {
    const active = event.active as Array<{ index: number }> | undefined;
    this.hoveredIndex.set(active && active.length > 0 ? active[0].index : null);
  }

  onChartClick(event: { event?: ChartEvent; active?: object[] }): void {
    const active = event.active as Array<{ index: number }> | undefined;
    if (active && active.length > 0) {
      this.selectedIndex.set(active[0].index);
    }
  }

  selectCategory(index: number): void {
    this.selectedIndex.set(index);
  }

  private resetSelection(): void {
    this.selectedIndex.set(null);
    this.hoveredIndex.set(null);
  }

  private load(): void {
    const range = presetRange(this.preset(), { start: this.customStart(), end: this.customEnd() });
    this.loading.set(true);
    this.errorMessage.set(null);
    this.resetSelection();

    this.expensesService.listAllExpenses(range).subscribe({
      next: (expenses) => {
        this.loading.set(false);
        this.totals.set(aggregateByCategory(expenses, this.categoriesById()));
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage.set('Не удалось загрузить данные диаграммы');
      },
    });
  }
}
