import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { lastValueFrom } from 'rxjs';
import { RoleService } from '../../../core/services/role.service';
import { Role } from '../../../core/models/role.model';

interface RoleForm {
  roleCode: string;
  roleName: string;
  description: string;
}

const EMPTY_FORM = (): RoleForm => ({ roleCode: '', roleName: '', description: '' });

@Component({
  selector: 'app-admin-roles',
  imports: [FormsModule],
  templateUrl: './admin-roles.component.html',
})
export class AdminRolesComponent implements OnInit {
  private roleSvc = inject(RoleService);

  roles = signal<Role[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  showModal = signal(false);
  editingRole = signal<Role | null>(null);
  form: RoleForm = EMPTY_FORM();
  formLoading = signal(false);
  formError = signal<string | null>(null);

  roleToDelete = signal<Role | null>(null);
  deleteLoading = signal(false);

  async ngOnInit() {
    await this.loadData();
  }

  async loadData() {
    this.loading.set(true);
    this.error.set(null);
    try {
      const res = await lastValueFrom(this.roleSvc.getAll());
      this.roles.set(res.data);
    } catch {
      this.error.set('Error al cargar los roles. Verifica la conexión con el servidor.');
    } finally {
      this.loading.set(false);
    }
  }

  openCreate() {
    this.editingRole.set(null);
    this.form = EMPTY_FORM();
    this.formError.set(null);
    this.showModal.set(true);
  }

  openEdit(role: Role) {
    this.editingRole.set(role);
    this.form = { roleCode: role.roleCode, roleName: role.roleName, description: role.description ?? '' };
    this.formError.set(null);
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
  }

  async saveRole() {
    const f = this.form;
    if (!f.roleName.trim()) {
      this.formError.set('El nombre del rol es obligatorio');
      return;
    }
    if (!this.editingRole() && !f.roleCode.trim()) {
      this.formError.set('El código del rol es obligatorio');
      return;
    }
    if (!this.editingRole() && f.roleCode.length > 3) {
      this.formError.set('El código no puede tener más de 3 caracteres');
      return;
    }
    this.formError.set(null);
    this.formLoading.set(true);
    try {
      const payload: Role = {
        roleCode: f.roleCode.toUpperCase(),
        roleName: f.roleName,
        description: f.description || undefined,
      };
      if (this.editingRole()) {
        await lastValueFrom(this.roleSvc.update(this.editingRole()!.roleCode, payload));
      } else {
        await lastValueFrom(this.roleSvc.create(payload));
      }
      this.closeModal();
      await this.loadData();
    } catch (err: unknown) {
      const msg = (err as { error?: { message?: string } })?.error?.message;
      this.formError.set(msg ?? 'Error al guardar el rol');
    } finally {
      this.formLoading.set(false);
    }
  }

  confirmDelete(role: Role) {
    this.roleToDelete.set(role);
  }

  cancelDelete() {
    this.roleToDelete.set(null);
  }

  async deleteRole() {
    const role = this.roleToDelete();
    if (!role) return;
    this.deleteLoading.set(true);
    try {
      await lastValueFrom(this.roleSvc.remove(role.roleCode));
      this.roleToDelete.set(null);
      await this.loadData();
    } catch (err: unknown) {
      const msg = (err as { error?: { message?: string } })?.error?.message;
      this.error.set(msg ?? 'Error al eliminar el rol');
      this.roleToDelete.set(null);
    } finally {
      this.deleteLoading.set(false);
    }
  }
}
