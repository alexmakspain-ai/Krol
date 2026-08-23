import { Component, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';

import { AuthService } from './auth/auth.service';
import { TranslatePipe } from './shared/i18n/translate.pipe';
import { LanguageSwitcher } from './shared/language-switcher/language-switcher';

@Component({
  imports: [RouterOutlet, TranslatePipe, LanguageSwitcher],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  protected readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  logout(): void {
    this.authService.logout();
    this.router.navigateByUrl('/login');
  }
}
