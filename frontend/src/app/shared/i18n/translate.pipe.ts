import { Pipe, PipeTransform, inject } from '@angular/core';

import { TranslateService } from './translate.service';
import { TranslationKey } from './translations';

/** Impure: re-evaluates every change-detection cycle so it reacts to locale switches. */
@Pipe({ name: 'translate', pure: false })
export class TranslatePipe implements PipeTransform {
  private readonly translateService = inject(TranslateService);

  transform(key: TranslationKey, params?: Record<string, string | number>): string {
    return this.translateService.translate(key, params);
  }
}
