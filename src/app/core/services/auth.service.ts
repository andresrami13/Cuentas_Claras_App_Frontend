import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { switchMap, tap, map, catchError } from 'rxjs/operators';
import { lastValueFrom, throwError } from 'rxjs';
import { User, LoginCredentials, RegisterForm, ApiResponse, LoginResponse } from '../models/user.model';

import { environment } from '../../../environments/environment';

const API = environment.apiUrl;

const USER_KEY = 'spendcount_user';
const TOKEN_KEY = 'spendcount_token';
const TOKEN_EXPIRY_KEY = 'spendcount_token_expiry';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly _user = signal<User | null>(this.loadFromStorage());

  readonly user = this._user.asReadonly();
  readonly isLoggedIn = computed(() => this._user() !== null);

  get token(): string | null {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return null;
    const expiry = Number(localStorage.getItem(TOKEN_EXPIRY_KEY));
    if (expiry && Date.now() >= expiry) return null;
    return token;
  }

  private loadFromStorage(): User | null {
    try {
      if (!this.token) {
        localStorage.removeItem(USER_KEY);
        return null;
      }
      const stored = localStorage.getItem(USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  private storeToken(login: LoginResponse): void {
    if (!login.token) return;
    localStorage.setItem(TOKEN_KEY, login.token);
    if (login.expiresIn) {
      localStorage.setItem(TOKEN_EXPIRY_KEY, String(Date.now() + login.expiresIn * 1000));
    }
  }

  private handleError(err: unknown) {
    if (err instanceof Error) return throwError(() => err);
    const httpErr = err as HttpErrorResponse;
    const msg = httpErr.error?.message || 'Error inesperado, intenta de nuevo';
    return throwError(() => new Error(msg));
  }

  login(credentials: LoginCredentials): Promise<void> {
    const login$ = this.http
      .post<ApiResponse<LoginResponse>>(`${API}/users/login`, credentials)
      .pipe(
        switchMap(res => {
          if (!res.data.match) throw new Error(res.data.detail);
          this.storeToken(res.data);
          return this.http.get<ApiResponse<User>>(`${API}/users/${credentials.documentNumber}`);
        }),
        tap(res => {
          localStorage.setItem(USER_KEY, JSON.stringify(res.data));
          this._user.set(res.data);
        }),
        map(() => void 0 as void),
        catchError((err: HttpErrorResponse) => this.handleError(err)),
      );
    return lastValueFrom(login$);
  }

  register(form: RegisterForm): Promise<void> {
    const body = {
      documentNumber: form.documentNumber,
      documentType: form.documentType,
      name: form.name,
      lastName: form.lastName,
      email: form.email,
      celNumber: form.celNumber,
      birthDate: form.birthDate,
      password: form.password,
    };
    const register$ = this.http
      .post<ApiResponse<User>>(`${API}/users`, body)
      .pipe(
        switchMap(() =>
          this.http.post<ApiResponse<LoginResponse>>(`${API}/users/login`, {
            documentNumber: form.documentNumber,
            password: form.password,
          }),
        ),
        tap(res => {
          if (!res.data.match) throw new Error(res.data.detail);
          this.storeToken(res.data);
        }),
        switchMap(() => this.http.get<ApiResponse<User>>(`${API}/users/${form.documentNumber}`)),
        tap(res => {
          localStorage.setItem(USER_KEY, JSON.stringify(res.data));
          this._user.set(res.data);
        }),
        map(() => void 0 as void),
        catchError((err: HttpErrorResponse) => this.handleError(err)),
      );
    return lastValueFrom(register$);
  }

  logout(): void {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
    this._user.set(null);
  }
}
