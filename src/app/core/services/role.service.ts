import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ApiResponse } from '../models/user.model';
import { Role } from '../models/role.model';

import { environment } from '../../../environments/environment';

const API = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class RoleService {
  private readonly http = inject(HttpClient);

  getAll() {
    return this.http.get<ApiResponse<Role[]>>(`${API}/roles`);
  }

  create(role: Role) {
    return this.http.post<ApiResponse<Role>>(`${API}/roles`, role);
  }

  update(roleCode: string, role: Partial<Role>) {
    return this.http.put<ApiResponse<Role>>(`${API}/roles/${roleCode}`, role);
  }

  remove(roleCode: string) {
    return this.http.delete<ApiResponse<void>>(`${API}/roles/${roleCode}`);
  }
}
