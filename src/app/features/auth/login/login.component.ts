import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { RegisterForm } from '../../../core/models/user.model';

const EMPTY_FORM = (): RegisterForm => ({
  documentType: 'CC',
  documentNumber: '',
  name: '',
  lastName: '',
  email: '',
  celNumber: '',
  birthDate: '',
  password: '',
  confirmPassword: '',
});

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  documentNumber = '';
  password = '';
  showPassword = signal(false);
  loading = signal(false);
  error = signal<string | null>(null);

  showRegister = signal(false);
  registerStep = signal(1);
  registerLoading = signal(false);
  registerError = signal<string | null>(null);
  registerForm: RegisterForm = EMPTY_FORM();
  showRegisterPassword = signal(false);
  showRegisterConfirm = signal(false);

  readonly documentTypes = ['CC', 'TI', 'CE', 'PA', 'NIT'];
  readonly today = new Date().toISOString().split('T')[0];

  async handleLogin(): Promise<void> {
    if (!this.documentNumber || !this.password) {
      this.error.set('Por favor completa todos los campos');
      return;
    }
    this.error.set(null);
    this.loading.set(true);
    try {
      await this.auth.login({ documentNumber: this.documentNumber, password: this.password });
      const role = this.auth.user()?.role?.roleCode;
      this.router.navigate([role === 'ADM' ? '/admin/users' : '/transactions']);
    } catch (err: unknown) {
      this.error.set(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      this.loading.set(false);
    }
  }

  openRegister(): void {
    this.registerForm = EMPTY_FORM();
    this.registerError.set(null);
    this.registerStep.set(1);
    this.showRegister.set(true);
  }

  closeRegister(): void {
    this.showRegister.set(false);
  }

  nextStep(): void {
    const f = this.registerForm;
    if (this.registerStep() === 1) {
      if (!f.documentType || !f.documentNumber || !f.name || !f.lastName) {
        this.registerError.set('Por favor completa todos los campos');
        return;
      }
      if (!/^\d+$/.test(f.documentNumber)) {
        this.registerError.set('El número de documento solo debe contener números');
        return;
      }
    } else if (this.registerStep() === 2) {
      if (!f.email || !f.celNumber || !f.birthDate) {
        this.registerError.set('Por favor completa todos los campos');
        return;
      }
      if (!/^\d+$/.test(f.celNumber)) {
        this.registerError.set('El número de celular solo debe contener números');
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email) || !f.email.toLowerCase().includes('.com')) {
        this.registerError.set('El correo debe tener un formato válido (ejemplo: usuario@dominio.com)');
        return;
      }
      if (f.birthDate > this.today) {
        this.registerError.set('La fecha de nacimiento no puede ser posterior a hoy');
        return;
      }
    }
    this.registerError.set(null);
    this.registerStep.update(s => s + 1);
  }

  prevStep(): void {
    this.registerError.set(null);
    this.registerStep.update(s => s - 1);
  }

  async handleRegister(): Promise<void> {
    const f = this.registerForm;
    if (!f.password || !f.confirmPassword) {
      this.registerError.set('Por favor completa todos los campos');
      return;
    }
    if (f.password !== f.confirmPassword) {
      this.registerError.set('Las contraseñas no coinciden');
      return;
    }
    this.registerError.set(null);
    this.registerLoading.set(true);
    try {
      await this.auth.register(f);
      this.router.navigate(['/transactions']);
    } catch (err: unknown) {
      this.registerError.set(err instanceof Error ? err.message : 'Error al registrarse');
    } finally {
      this.registerLoading.set(false);
    }
  }
}
