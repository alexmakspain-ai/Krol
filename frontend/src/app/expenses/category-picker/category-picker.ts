import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  ElementRef,
  HostListener,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ApiErrorResponse } from '../../shared/api-error.model';
import { ExpensesService } from '../expenses.service';
import { Category } from '../models/expense.models';

const DEFAULT_COLOR = '#4285f4';

interface CategoryNode {
  category: Category;
  children: Category[];
}

@Component({
  selector: 'app-category-picker',
  imports: [FormsModule],
  templateUrl: './category-picker.html',
  styleUrl: './category-picker.scss',
})
export class CategoryPicker {
  private readonly expensesService = inject(ExpensesService);
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  readonly categories = input.required<Category[]>();
  readonly selectedId = input<number | null>(null);

  readonly selected = output<number | null>();
  readonly categoryCreated = output<Category>();
  readonly categoryDeleted = output<number>();

  readonly open = signal(false);
  readonly creatingParentId = signal<number | 'root' | null>(null);
  readonly newName = signal('');
  readonly newColor = signal(DEFAULT_COLOR);
  readonly errorMessage = signal<string | null>(null);

  readonly tree = computed<CategoryNode[]>(() => {
    const all = this.categories();
    return all
      .filter((c) => c.parent_id === null)
      .map((category) => ({
        category,
        children: all.filter((c) => c.parent_id === category.id),
      }));
  });

  readonly selectedCategory = computed<Category | null>(
    () => this.categories().find((c) => c.id === this.selectedId()) ?? null,
  );

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.elementRef.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }

  toggle(): void {
    if (this.open()) {
      this.close();
    } else {
      this.open.set(true);
    }
  }

  close(): void {
    this.open.set(false);
    this.cancelCreate();
  }

  select(id: number): void {
    this.selected.emit(id);
    this.close();
  }

  startCreate(parentId: number | 'root'): void {
    this.creatingParentId.set(parentId);
    this.newName.set('');
    this.newColor.set(DEFAULT_COLOR);
    this.errorMessage.set(null);
  }

  cancelCreate(): void {
    this.creatingParentId.set(null);
  }

  confirmCreate(): void {
    const name = this.newName().trim();
    if (!name) {
      return;
    }

    const parentId = this.creatingParentId();
    this.expensesService
      .createCategory({
        name,
        color: this.newColor(),
        parent_id: parentId === 'root' || parentId === null ? null : parentId,
      })
      .subscribe({
        next: (category) => {
          this.categoryCreated.emit(category);
          this.select(category.id);
        },
        error: (err: HttpErrorResponse) => {
          this.errorMessage.set(
            (err.error as ApiErrorResponse)?.detail ?? 'Не удалось создать категорию',
          );
        },
      });
  }

  deleteCategory(category: Category, event: MouseEvent): void {
    event.stopPropagation();
    if (!confirm(`Удалить категорию «${category.name}»?`)) {
      return;
    }

    this.errorMessage.set(null);
    this.expensesService.deleteCategory(category.id).subscribe({
      next: () => this.categoryDeleted.emit(category.id),
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(
          (err.error as ApiErrorResponse)?.detail ?? 'Не удалось удалить категорию',
        );
      },
    });
  }
}
