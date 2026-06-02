import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ApiResponse, User } from '../models/user.model';

import { environment } from '../../../environments/environment';

const API = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);

  getAll() {
    return this.http.get<ApiResponse<User[]>>(`${API}/users`);
  }

  create(payload: object) {
    return this.http.post<ApiResponse<User>>(`${API}/users`, payload);
  }

  update(documentNumber: string, payload: object) {
    return this.http.put<ApiResponse<User>>(`${API}/users/${documentNumber}`, payload);
  }

  remove(documentNumber: string) {
    return this.http.delete<ApiResponse<void>>(`${API}/users/${documentNumber}`);
  }
}
