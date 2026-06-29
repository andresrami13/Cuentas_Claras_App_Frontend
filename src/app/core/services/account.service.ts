import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { lastValueFrom, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Account, AccountForm, AccountType } from '../models/account.model';
import { ApiResponse } from '../models/user.model';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

const API = environment.apiUrl;

interface AccountDto {
  accountId?: number;
  userDocumentNumber?: string;
  name?: string;
  type?: AccountType;
  provider?: string | null;
  initialBalance?: number;
  color?: string;
  icon?: string;
  archived?: boolean;
}

function toAccount(dto: AccountDto): Account {
  return {
    id: String(dto.accountId ?? ''),
    name: dto.name ?? '',
    type: dto.type ?? 'OTHER',
    provider: dto.provider ?? null,
    initialBalance: dto.initialBalance ?? 0,
    color: dto.color ?? '#475569',
    icon: dto.icon ?? '💳',
    archived: dto.archived ?? false,
  };
}

@Injectable({ providedIn: 'root' })
export class AccountService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  private readonly _accounts = signal<Account[]>([]);
  private readonly _loading = signal(false);

  readonly accounts = this._accounts.asReadonly();
  readonly loading = this._loading.asReadonly();

  private get documentNumber(): string {
    return this.auth.user()?.documentNumber ?? '';
  }

  private handleError(err: HttpErrorResponse) {
    const msg = err.error?.message || 'Error inesperado, intenta de nuevo';
    return throwError(() => new Error(msg));
  }

  private toBody(form: AccountForm): AccountDto {
    return {
      userDocumentNumber: this.documentNumber,
      name: form.name,
      type: form.type,
      provider: form.provider || null,
      initialBalance: form.initialBalance ?? 0,
      color: form.color,
      icon: form.icon,
    };
  }

  async loadAll(): Promise<void> {
    this._loading.set(true);
    try {
      const res = await lastValueFrom(
        this.http.get<ApiResponse<AccountDto[]>>(
          `${API}/accounts/users/${this.documentNumber}`
        )
      );
      this._accounts.set((res.data ?? []).map(toAccount));
    } catch {
      this._accounts.set([]);
    } finally {
      this._loading.set(false);
    }
  }

  async add(form: AccountForm): Promise<void> {
    const res = await lastValueFrom(
      this.http.post<ApiResponse<AccountDto>>(`${API}/accounts`, this.toBody(form))
        .pipe(catchError((err: HttpErrorResponse) => this.handleError(err)))
    );
    this._accounts.update(list => [...list, toAccount(res.data)]);
  }

  async update(id: string, form: AccountForm): Promise<void> {
    const res = await lastValueFrom(
      this.http.put<ApiResponse<AccountDto>>(`${API}/accounts/${id}`, this.toBody(form))
        .pipe(catchError((err: HttpErrorResponse) => this.handleError(err)))
    );
    const updated = toAccount(res.data);
    this._accounts.update(list => list.map(a => a.id === id ? updated : a));
  }

  async remove(id: string): Promise<void> {
    await lastValueFrom(
      this.http.delete<ApiResponse<null>>(`${API}/accounts/${id}`)
        .pipe(catchError((err: HttpErrorResponse) => this.handleError(err)))
    );
    this._accounts.update(list => list.filter(a => a.id !== id));
  }
}
