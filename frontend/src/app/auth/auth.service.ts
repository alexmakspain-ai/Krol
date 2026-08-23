import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, map, switchMap } from 'rxjs';

import { API_BASE_URL } from '../shared/api-config';
import { LoginRequest, RegisterRequest, StoredAuth, TokenResponse } from './models/auth.models';

const STORAGE_KEY = 'expense-tracker-auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly authState = signal<StoredAuth | null>(readFromStorage());

  readonly isAuthenticated = computed(() => this.authState() !== null);
  readonly currentUserEmail = computed(() => this.authState()?.email ?? null);

  get token(): string | null {
    return this.authState()?.accessToken ?? null;
  }

  register(payload: RegisterRequest): Observable<void> {
    return this.http
      .post<void>(`${API_BASE_URL}/auth/register`, payload)
      .pipe(switchMap(() => this.login(payload)));
  }

  login(payload: LoginRequest): Observable<void> {
    const body = new HttpParams()
      .set('username', payload.email)
      .set('password', payload.password);

    return this.http
      .post<TokenResponse>(`${API_BASE_URL}/auth/login`, body, {
        headers: new HttpHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' }),
      })
      .pipe(
        map((response) => {
          const auth: StoredAuth = { accessToken: response.access_token, email: payload.email };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
          this.authState.set(auth);
        }),
      );
  }

  logout(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.authState.set(null);
  }
}

function readFromStorage(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredAuth) : null;
  } catch {
    return null;
  }
}
