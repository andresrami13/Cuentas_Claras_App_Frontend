import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { lastValueFrom } from 'rxjs';
import { UserService } from '../../../core/services/user.service';
import { RoleService } from '../../../core/services/role.service';
import { User } from '../../../core/models/user.model';
import { Role } from '../../../core/models/role.model';

interface UserForm {
  documentType: string;
  documentNumber: string;
  name: string;
  lastName: string;
  email: string;
  celNumber: string;
  birthDate: string;
  password: string;
  locked: boolean;
  roleCode: string;
}

const EMPTY_FORM = (): UserForm => ({
  documentType: 'CC',
  documentNumber: '',
  name: '',
  lastName: '',
  email: '',
  celNumber: '',
  birthDate: '',
  password: '',
  locked: false,
  roleCode: 'USR',
});

@Component({
  selector: 'app-admin-users',
  imports: [FormsModule],
  templateUrl: './admin-users.component.html',
})
export class AdminUsersComponent implements OnInit {
  private userSvc = inject(UserService);
  private roleSvc = inject(RoleService);

  users = signal<User[]>([]);
  roles = signal<Role[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  showModal = signal(false);
  editingUser = signal<User | null>(null);
  form: UserForm = EMPTY_FORM();
  formLoading = signal(false);
  formError = signal<string | null>(null);
  showPassword = signal(false);

  userToDelete = signal<User | null>(null);
  deleteLoading = signal(false);

  readonly documentTypes = ['CC', 'TI', 'CE', 'PA', 'NIT'];

  async ngOnInit() {
    await this.loadData();
  }

  async loadData() {
    this.loading.set(true);
    this.error.set(null);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        lastValueFrom(this.userSvc.getAll()),
        lastValueFrom(this.roleSvc.getAll()),
      ]);
      this.users.set(usersRes.data);
      this.roles.set(rolesRes.data);
    } catch {
      this.error.set('Error al cargar los datos. Verifica la conexión con el servidor.');
    } finally {
      this.loading.set(false);
    }
  }

  openCreate() {
    this.editingUser.set(null);
    this.form = EMPTY_FORM();
    this.formError.set(null);
    this.showPassword.set(false);
    this.showModal.set(true);
  }

  openEdit(user: User) {
    this.editingUser.set(user);
    this.form = {
      documentType: user.documentType ?? 'CC',
      documentNumber: user.documentNumber,
      name: user.name,
      lastName: user.lastName,
      email: user.email,
      celNumber: user.celNumber ?? '',
      birthDate: user.birthDate ? (user.birthDate as string).split('T')[0] : '',
      password: '',
      locked: user.locked ?? false,
      roleCode: user.role?.roleCode ?? 'USR',
    };
    this.formError.set(null);
    this.showPassword.set(false);
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
  }

  async saveUser() {
    const f = this.form;
    if (!f.documentNumber || !f.name || !f.lastName || !f.email || !f.celNumber || !f.birthDate || !f.roleCode) {
      this.formError.set('Por favor completa todos los campos obligatorios');
      return;
    }
    if (!this.editingUser() && !f.password) {
      this.formError.set('La contraseña es obligatoria al crear un usuario');
      return;
    }
    this.formError.set(null);
    this.formLoading.set(true);
    try {
      const payload: Record<string, unknown> = {
        documentNumber: f.documentNumber,
        documentType: f.documentType,
        name: f.name,
        lastName: f.lastName,
        email: f.email,
        celNumber: f.celNumber,
        birthDate: f.birthDate,
        locked: f.locked,
        role: { roleCode: f.roleCode },
      };
      if (f.password) payload['password'] = f.password;

      if (this.editingUser()) {
        await lastValueFrom(this.userSvc.update(this.editingUser()!.documentNumber, payload));
      } else {
        await lastValueFrom(this.userSvc.create(payload));
      }
      this.closeModal();
      await this.loadData();
    } catch (err: unknown) {
      const msg = (err as { error?: { message?: string } })?.error?.message;
      this.formError.set(msg ?? 'Error al guardar el usuario');
    } finally {
      this.formLoading.set(false);
    }
  }

  confirmDelete(user: User) {
    this.userToDelete.set(user);
  }

  cancelDelete() {
    this.userToDelete.set(null);
  }

  async deleteUser() {
    const user = this.userToDelete();
    if (!user) return;
    this.deleteLoading.set(true);
    try {
      await lastValueFrom(this.userSvc.remove(user.documentNumber));
      this.userToDelete.set(null);
      await this.loadData();
    } catch (err: unknown) {
      const msg = (err as { error?: { message?: string } })?.error?.message;
      this.error.set(msg ?? 'Error al eliminar el usuario');
      this.userToDelete.set(null);
    } finally {
      this.deleteLoading.set(false);
    }
  }

  initials(user: User): string {
    return (user.name.charAt(0) + (user.lastName?.charAt(0) ?? '')).toUpperCase();
  }
}
