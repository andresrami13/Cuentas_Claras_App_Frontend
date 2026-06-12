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
      { path: '', redirectTo: 'budget', pathMatch: 'full' },
      {
        path: 'transactions',
        loadComponent: () => import('./features/transactions/transactions.component').then(m => m.TransactionsComponent),
      },
      {
        path: 'reports',
        loadComponent: () => import('./features/reports/reports.component').then(m => m.ReportsComponent),
      },
      {
        path: 'budget',
        children: [
          {
            path: '',
            pathMatch: 'full',
            loadComponent: () => import('./features/budget/budget.component').then(m => m.BudgetComponent),
          },
          {
            path: 'config',
            loadComponent: () => import('./features/budget/budget-config/budget-config.component').then(m => m.BudgetConfigComponent),
          },
          {
            path: 'projection',
            loadComponent: () => import('./features/budget/projection/projection.component').then(m => m.ProjectionComponent),
          },
        ],
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
        path: 'settings',
        loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent),
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
