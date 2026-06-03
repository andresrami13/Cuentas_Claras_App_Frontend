import { Component, inject, computed, output } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

interface NavItem {
  label: string;
  route: string;
  icon: string;
}

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
})
export class SidebarComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly user = this.auth.user;
  readonly closeSidebar = output<void>();

  readonly isAdmin = computed(() => this.auth.user()?.role?.roleCode === 'ADM');

  readonly navItems = computed<NavItem[]>(() => {
    if (this.isAdmin()) {
      return [
        { label: 'Usuarios', route: '/admin/users', icon: 'users' },
        { label: 'Roles', route: '/admin/roles', icon: 'roles' },
      ];
    }
    return [
      { label: 'Presupuesto', route: '/budget', icon: 'budget' },
      { label: 'Movimientos', route: '/transactions', icon: 'transactions' },
      { label: 'Reportes', route: '/reports', icon: 'reports' },
      { label: 'Metas', route: '/goals', icon: 'goals' },
      { label: 'Coach IA', route: '/coach', icon: 'coach' },
    ];
  });

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  onNavClick(): void {
    this.closeSidebar.emit();
  }
}
