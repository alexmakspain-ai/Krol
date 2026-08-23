import { DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { ChartConfiguration, ChartData, ChartEvent } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

import { CategoryTotal, aggregateByTopCategory, buildCategoriesById } from '../../expenses/category-aggregation';
import { ExpensesService } from '../../expenses/expenses.service';
import { Category, Expense } from '../../expenses/models/expense.models';
import { TranslatePipe } from '../../shared/i18n/translate.pipe';
import { TranslateService } from '../../shared/i18n/translate.service';
import { DateRange, PeriodPreset, isoDate, presetRange, startOfMonth } from '../../shared/period';
import { PeriodFilter } from '../../shared/period-filter/period-filter';

const EXPENSES_TABLE_ANCHOR_ID = 'expenses-table-section';

function formatDisplayDate(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${day}.${month}.${year}`;
}

/**
 * For each top-level category, breaks its total down into "direct" spending
 * (expenses assigned straight to the parent) plus one entry per subcategory —
 * shown in the info panel once a category segment is selected.
 */
function aggregateSubcategoryBreakdown(
  expenses: Expense[],
  categoriesMap: Map<number, Category>,
  noSubcategoryLabel: string,
): Map<number, CategoryTotal[]> {
  const directTotals = new Map<number, number>();
  const subTotals = new Map<number, Map<number, CategoryTotal>>();

  for (const expense of expenses) {
    const category = expense.category;
    if (category.parent_id === null) {
      directTotals.set(category.id, (directTotals.get(category.id) ?? 0) + expense.amount);
    } else {
      const topId = category.parent_id;
      if (!subTotals.has(topId)) {
        subTotals.set(topId, new Map());
      }
      const map = subTotals.get(topId)!;
      const existing = map.get(category.id);
      if (existing) {
        existing.total += expense.amount;
      } else {
        map.set(category.id, {
          categoryId: category.id,
          name: category.name,
          color: category.color,
          total: expense.amount,
        });
      }
    }
  }

  const result = new Map<number, CategoryTotal[]>();
  const allTopIds = new Set([...directTotals.keys(), ...subTotals.keys()]);

  for (const topId of allTopIds) {
    const items: CategoryTotal[] = [];
    const direct = directTotals.get(topId);
    if (direct) {
      const topCategory = categoriesMap.get(topId);
      items.push({
        categoryId: topId,
        name: noSubcategoryLabel,
        color: topCategory?.color ?? '#999999',
        total: direct,
      });
    }
    const subs = subTotals.get(topId);
    if (subs) {
      items.push(...subs.values());
    }
    items.sort((a, b) => b.total - a.total);
    result.set(topId, items);
  }

  return result;
}

@Component({
  selector: 'app-single-expenses-chart',
  imports: [PeriodFilter, BaseChartDirective, DecimalPipe, TranslatePipe],
  templateUrl: './single-expenses-chart.html',
  styleUrl: './single-expenses-chart.scss',
})
export class SingleExpensesChart implements OnInit {
  private readonly expensesService = inject(ExpensesService);
  private readonly translateService = inject(TranslateService);

  readonly categories = input.required<Category[]>();
  /** Preset used unless initialRange is given. */
  readonly initialPreset = input<PeriodPreset>('month');
  /** When set, the chart starts on this exact custom range instead of initialPreset. */
  readonly initialRange = input<DateRange | null>(null);

  readonly preset = signal<PeriodPreset>('month');
  readonly customStart = signal(isoDate(startOfMonth(new Date())));
  readonly customEnd = signal(isoDate(new Date()));

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly totals = signal<CategoryTotal[]>([]);
  readonly subcategoryBreakdown = signal<Map<number, CategoryTotal[]>>(new Map());
  readonly selectedIndex = signal<number | null>(null);

  readonly totalAmount = computed(() => this.totals().reduce((sum, t) => sum + t.total, 0));

  readonly periodLabel = computed(() => {
    const range = presetRange(this.preset(), { start: this.customStart(), end: this.customEnd() });
    return `${formatDisplayDate(range.start)} – ${formatDisplayDate(range.end)}`;
  });

  readonly selectedCategory = computed<CategoryTotal | null>(() => {
    const index = this.selectedIndex();
    return index === null ? null : (this.totals()[index] ?? null);
  });

  readonly selectedPercentage = computed(() => {
    const category = this.selectedCategory();
    const total = this.totalAmount();
    return category && total > 0 ? (category.total / total) * 100 : 0;
  });

  readonly selectedBreakdown = computed<CategoryTotal[]>(() => {
    const category = this.selectedCategory();
    if (!category) {
      return [];
    }
    const items = this.subcategoryBreakdown().get(category.categoryId) ?? [];
    // Only worth showing when it actually splits the total into more than one line.
    return items.length > 1 ? items : [];
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

  private readonly categoriesMap = computed(() => buildCategoriesById(this.categories()));

  ngOnInit(): void {
    const range = this.initialRange();
    if (range) {
      this.preset.set('custom');
      this.customStart.set(range.start);
      this.customEnd.set(range.end);
    } else {
      this.preset.set(this.initialPreset());
    }
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

  onChartClick(event: { event?: ChartEvent; active?: object[] }): void {
    const active = event.active as Array<{ index: number }> | undefined;
    if (active && active.length > 0) {
      this.selectCategory(active[0].index);
    }
  }

  selectCategory(index: number): void {
    this.selectedIndex.update((current) => (current === index ? null : index));
  }

  goToCategory(): void {
    document
      .getElementById(EXPENSES_TABLE_ANCHOR_ID)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  private resetSelection(): void {
    this.selectedIndex.set(null);
  }

  private load(): void {
    const range = presetRange(this.preset(), { start: this.customStart(), end: this.customEnd() });
    this.loading.set(true);
    this.errorMessage.set(null);
    this.resetSelection();

    this.expensesService.listAllExpenses(range).subscribe({
      next: (expenses) => {
        this.loading.set(false);
        const categoriesMap = this.categoriesMap();
        this.totals.set(aggregateByTopCategory(expenses, categoriesMap));
        this.subcategoryBreakdown.set(
          aggregateSubcategoryBreakdown(
            expenses,
            categoriesMap,
            this.translateService.translate('expensesChart.noSubcategory'),
          ),
        );
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage.set(this.translateService.translate('expensesChart.loadError'));
      },
    });
  }
}
