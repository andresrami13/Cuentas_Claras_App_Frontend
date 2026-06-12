import { Component, inject } from '@angular/core';
import { Location } from '@angular/common';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
})
export class SettingsComponent {
  protected readonly themeSvc = inject(ThemeService);
  private readonly location = inject(Location);

  close(): void {
    this.location.back();
  }
}
