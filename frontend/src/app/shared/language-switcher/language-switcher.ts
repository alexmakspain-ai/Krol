import { Component, inject } from '@angular/core';

import { LOCALES, LOCALE_LABELS, Locale } from '../i18n/locale';
import { TranslateService } from '../i18n/translate.service';

@Component({
  selector: 'app-language-switcher',
  templateUrl: './language-switcher.html',
  styleUrl: './language-switcher.scss',
})
export class LanguageSwitcher {
  protected readonly translateService = inject(TranslateService);
  protected readonly locales = LOCALES;
  protected readonly localeLabels = LOCALE_LABELS;

  select(locale: Locale): void {
    this.translateService.setLocale(locale);
  }
}
