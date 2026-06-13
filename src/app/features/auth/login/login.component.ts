import { Component, inject, signal, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { RegisterForm } from '../../../core/models/user.model';

declare const google: {
  accounts: {
    id: {
      initialize(config: object): void;
      renderButton(parent: HTMLElement, options: object): void;
    };
  };
};

const GOOGLE_CLIENT_ID = '674298948659-vjnsnaoc7frktpipeel4kbbsfomobqlp.apps.googleusercontent.com';

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

const EMPTY_GOOGLE_COMPLETE = () => ({
  documentType: 'CC',
  documentNumber: '',
  celNumber: '',
  birthDate: '',
});

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.component.html',
})
export class LoginComponent implements AfterViewInit {
  private auth = inject(AuthService);
  private router = inject(Router);

  documentNumber = '';
  password = '';
  showPassword = signal(false);
  loading = signal(false);
  error = signal<string | null>(null);
  failedAttempts = signal(0);
  isBlocked = signal(false);
  private lastAttemptedDoc = '';

  showRegister = signal(false);
  registerStep = signal(1);
  registerLoading = signal(false);
  registerError = signal<string | null>(null);
  registerForm: RegisterForm = EMPTY_FORM();
  showRegisterPassword = signal(false);
  showRegisterConfirm = signal(false);

  googleLoading = signal(false);
  googleError = signal<string | null>(null);
  showGoogleComplete = signal(false);
  googleCompleteForm = EMPTY_GOOGLE_COMPLETE();
  googleCompleteLoading = signal(false);
  googleCompleteError = signal<string | null>(null);
  googleProfile = signal<{ name: string; lastName: string; email: string } | null>(null);
  private pendingGoogleToken = '';
  private googleInitAttempts = 0;

  readonly documentTypes = ['CC', 'TI', 'CE', 'PA', 'NIT'];
  readonly today = new Date().toISOString().split('T')[0];

  ngAfterViewInit(): void {
    this.initGoogle();
  }

  private initGoogle(): void {
    if (typeof (window as any)['google'] === 'undefined') {
      if (this.googleInitAttempts++ < 30) setTimeout(() => this.initGoogle(), 200);
      return;
    }
    const g = (window as any)['google'];
    g.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (res: { credential: string }) => this.handleGoogleCredential(res),
    });
    const btn = document.getElementById('google-btn');
    if (btn) {
      g.accounts.id.renderButton(btn, {
        theme: 'filled_black',
        size: 'large',
        width: 360,
        text: 'continue_with',
        locale: 'es',
        shape: 'rectangular',
      });
    }
  }

  private async handleGoogleCredential(response: { credential: string }): Promise<void> {
    this.googleLoading.set(true);
    this.googleError.set(null);
    try {
      const result = await this.auth.loginWithGoogle(response.credential);
      if (result.isNewUser) {
        this.pendingGoogleToken = response.credential;
        this.googleProfile.set({ name: result.name!, lastName: result.lastName!, email: result.email! });
        this.googleCompleteForm = EMPTY_GOOGLE_COMPLETE();
        this.showGoogleComplete.set(true);
      } else {
        const role = this.auth.user()?.role?.roleCode;
        this.router.navigate([role === 'ADM' ? '/admin/users' : '/budget']);
      }
    } catch (err: unknown) {
      this.googleError.set(err instanceof Error ? err.message : 'Error al iniciar sesión con Google');
    } finally {
      this.googleLoading.set(false);
    }
  }

  async handleGoogleComplete(): Promise<void> {
    const f = this.googleCompleteForm;
    if (!f.documentType || !f.documentNumber || !f.celNumber || !f.birthDate) {
      this.googleCompleteError.set('Por favor completa todos los campos');
      return;
    }
    if (!/^\d+$/.test(f.documentNumber)) {
      this.googleCompleteError.set('El número de documento solo debe contener números');
      return;
    }
    if (!/^\d+$/.test(f.celNumber)) {
      this.googleCompleteError.set('El número de celular solo debe contener números');
      return;
    }
    if (f.birthDate > this.today) {
      this.googleCompleteError.set('La fecha de nacimiento no puede ser posterior a hoy');
      return;
    }
    this.googleCompleteError.set(null);
    this.googleCompleteLoading.set(true);
    try {
      await this.auth.registerWithGoogle({
        googleToken: this.pendingGoogleToken,
        documentType: f.documentType,
        documentNumber: f.documentNumber,
        celNumber: f.celNumber,
        birthDate: f.birthDate,
      });
      this.router.navigate(['/budget']);
    } catch (err: unknown) {
      this.googleCompleteError.set(err instanceof Error ? err.message : 'Error al completar el registro');
    } finally {
      this.googleCompleteLoading.set(false);
    }
  }

  onDocumentChange(): void {
    if (this.documentNumber !== this.lastAttemptedDoc) {
      this.failedAttempts.set(0);
      this.isBlocked.set(false);
      this.error.set(null);
    }
  }

  async handleLogin(): Promise<void> {
    if (this.isBlocked()) return;
    if (!this.documentNumber || !this.password) {
      this.error.set('Por favor completa todos los campos');
      return;
    }
    this.error.set(null);
    this.loading.set(true);
    this.lastAttemptedDoc = this.documentNumber;
    try {
      await this.auth.login({ documentNumber: this.documentNumber, password: this.password });
      this.failedAttempts.set(0);
      this.isBlocked.set(false);
      const role = this.auth.user()?.role?.roleCode;
      this.router.navigate([role === 'ADM' ? '/admin/users' : '/budget']);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al iniciar sesión';
      const blockedByServer = /bloqueada|bloqueado/i.test(msg);
      if (blockedByServer) {
        this.isBlocked.set(true);
        this.error.set(null);
      } else {
        const next = this.failedAttempts() + 1;
        this.failedAttempts.set(next);
        if (next >= 5) {
          this.isBlocked.set(true);
          this.error.set(null);
        } else {
          this.error.set(msg);
        }
      }
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
      this.router.navigate(['/budget']);
    } catch (err: unknown) {
      this.registerError.set(err instanceof Error ? err.message : 'Error al registrarse');
    } finally {
      this.registerLoading.set(false);
    }
  }
}
