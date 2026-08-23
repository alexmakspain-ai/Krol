import { Injectable, signal } from '@angular/core';

import { DEFAULT_LOCALE, Locale } from './locale';
import { TRANSLATIONS, TranslationKey } from './translations';

const STORAGE_KEY = 'expense-tracker-locale';

@Injectable({ providedIn: 'root' })
export class TranslateService {
  private readonly localeSignal = signal<Locale>(readStoredLocale());
  readonly locale = this.localeSignal.asReadonly();

  setLocale(locale: Locale): void {
    this.localeSignal.set(locale);
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      // localStorage may be unavailable (private browsing, blocked storage) — locale just won't persist.
    }
  }

  translate(key: TranslationKey, params?: Record<string, string | number>): string {
    const dict = TRANSLATIONS[this.localeSignal()];
    let text: string = dict[key] ?? TRANSLATIONS[DEFAULT_LOCALE][key] ?? key;
    if (params) {
      for (const [name, value] of Object.entries(params)) {
        text = text.replace(`{${name}}`, String(value));
      }
    }
    return text;
  }
}

function readStoredLocale(): Locale {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'uk' || raw === 'en') {
      return raw;
    }
  } catch {
    // localStorage may be unavailable — fall back to the default locale.
  }
  return DEFAULT_LOCALE;
}
