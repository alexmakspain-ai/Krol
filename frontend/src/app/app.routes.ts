import { Routes } from '@angular/router';

import { authGuard } from './auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./auth/login/login').then((m) => m.Login),
  },
  {
    path: 'register',
    loadComponent: () => import('./auth/register/register').then((m) => m.Register),
  },
  {
    path: 'expenses',
    loadComponent: () =>
      import('./expenses/expenses-page/expenses-page').then((m) => m.ExpensesPage),
    canActivate: [authGuard],
  },
  { path: '', pathMatch: 'full', redirectTo: 'expenses' },
  { path: '**', redirectTo: 'expenses' },
];
