import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { switchMap, tap, map, catchError } from 'rxjs/operators';
import { lastValueFrom, throwError } from 'rxjs';
import { User, LoginCredentials, RegisterForm, ApiResponse, LoginResponse } from '../models/user.model';

import { environment } from '../../../environments/environment';

const API = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly _user = signal<User | null>(this.loadFromStorage());

  readonly user = this._user.asReadonly();
  readonly isLoggedIn = computed(() => this._user() !== null);

  private loadFromStorage(): User | null {
    try {
      const stored = localStorage.getItem('spendcount_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
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
          return this.http.get<ApiResponse<User>>(`${API}/users/${credentials.documentNumber}`);
        }),
        tap(res => {
          localStorage.setItem('spendcount_user', JSON.stringify(res.data));
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
      locked: false,
      role: { roleCode: 'USR' },
    };
    const register$ = this.http
      .post<ApiResponse<User>>(`${API}/users`, body)
      .pipe(
        tap(res => {
          localStorage.setItem('spendcount_user', JSON.stringify(res.data));
          this._user.set(res.data);
        }),
        map(() => void 0 as void),
        catchError((err: HttpErrorResponse) => this.handleError(err)),
      );
    return lastValueFrom(register$);
  }

  logout(): void {
    localStorage.removeItem('spendcount_user');
    this._user.set(null);
  }
}
