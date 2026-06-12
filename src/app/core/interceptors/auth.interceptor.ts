import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

/** Peticiones públicas: login y registro de usuario nuevo. */
function isPublicRequest(method: string, url: string): boolean {
  if (method !== 'POST') return false;
  const path = url.split('?')[0].replace(/\/+$/, '');
  return path.endsWith('/users/login') || path.endsWith('/users');
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const isPublic = isPublicRequest(req.method, req.url);
  const token = auth.token;

  const request = !isPublic && token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(request).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && !isPublic) {
        auth.logout();
        router.navigate(['/login']);
        return throwError(() => new Error('Tu sesión ha expirado. Inicia sesión de nuevo.'));
      }
      return throwError(() => err);
    }),
  );
};
