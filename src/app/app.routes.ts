import { Routes } from '@angular/router';
import { authGuard, publicGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [publicGuard],
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./shared/layout/main-layout/main-layout.component').then(m => m.MainLayoutComponent),
    children: [
      { path: '', redirectTo: 'transactions', pathMatch: 'full' },
      {
        path: 'transactions',
        loadComponent: () => import('./features/transactions/transactions.component').then(m => m.TransactionsComponent),
      },
      {
        path: 'reports',
        loadComponent: () => import('./features/reports/reports.component').then(m => m.ReportsComponent),
      },
      {
        path: 'goals',
        loadComponent: () => import('./features/goals/goals.component').then(m => m.GoalsComponent),
      },
      {
        path: 'coach',
        loadComponent: () => import('./features/coach/coach.component').then(m => m.CoachComponent),
      },
      {
        path: 'admin',
        canActivate: [adminGuard],
        children: [
          { path: '', redirectTo: 'users', pathMatch: 'full' },
          {
            path: 'users',
            loadComponent: () => import('./features/admin/users/admin-users.component').then(m => m.AdminUsersComponent),
          },
          {
            path: 'roles',
            loadComponent: () => import('./features/admin/roles/admin-roles.component').then(m => m.AdminRolesComponent),
          },
        ],
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
