import { Component, signal, inject, computed } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, SidebarComponent],
  templateUrl: './main-layout.component.html',
})
export class MainLayoutComponent {
  private auth = inject(AuthService);
  readonly sidebarOpen = signal(false);
  readonly isAdmin = computed(() => this.auth.user()?.role?.roleCode === 'ADM');

  toggleSidebar(): void { this.sidebarOpen.update(v => !v); }
  closeSidebar(): void { this.sidebarOpen.set(false); }
}
