import { Category, Expense } from './models/expense.models';

export interface CategoryTotal {
  categoryId: number;
  name: string;
  color: string;
  total: number;
}

/** A subcategory's amount always rolls up into its parent for top-level aggregation. */
export function resolveTopCategory(category: Category, categoriesById: Map<number, Category>): Category {
  if (category.parent_id === null) {
    return category;
  }
  return categoriesById.get(category.parent_id) ?? category;
}

export function aggregateByTopCategory(
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

export function buildCategoriesById(categories: Category[]): Map<number, Category> {
  return new Map(categories.map((c) => [c.id, c]));
}
