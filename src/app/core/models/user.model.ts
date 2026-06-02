export interface User {
  documentNumber: string;
  name: string;
  lastName: string;
  email: string;
  documentType?: string;
  celNumber?: string;
  birthDate?: string;
  locked?: boolean;
  role?: { roleCode: string; roleName?: string; description?: string };
}

export interface LoginCredentials {
  documentNumber: string;
  password: string;
}

export interface RegisterForm {
  documentType: string;
  documentNumber: string;
  name: string;
  lastName: string;
  email: string;
  celNumber: string;
  birthDate: string;
  password: string;
  confirmPassword: string;
}

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export interface LoginResponse {
  match: boolean;
  detail: string;
}
