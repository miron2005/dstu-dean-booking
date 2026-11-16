
import {
  Component,
  OnInit,
  inject,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  ApiService,
  User,
  Faculty,
  UserCreate,
  UserUpdate,
} from '../../core/api';
import { RoleAvatar } from '../../shared/role-avatar';

type AdminTab = 'users' | 'faculties';
type UserRole = 'student' | 'secretary' | 'dean' | 'admin';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RoleAvatar],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css',
})
export class AdminDashboard implements OnInit {
  private api = inject(ApiService);
  private cdr = inject(ChangeDetectorRef);

  activeTab: AdminTab = 'users';

  users: User[] = [];
  faculties: Faculty[] = [];

  loading = true;
  saving = false;
  error = '';
  success = '';
  currentUserId: number | null = null;

  showUserForm = false;
  showFacultyForm = false;

  editingUserId: number | null = null;
  editingFacultyId: number | null = null;

  userForm: {
    full_name: string;
    email: string;
    password: string;
    role: UserRole;
    faculty_id: number | null;
  } = this.emptyUserForm();

  facultyForm = {
    name: '',
  };

  ngOnInit(): void {
    if (!this.api.getToken()) {
      window.location.href = '/login';
      return;
    }

    this.api.getMe().subscribe({
      next: user => {
        if (user.role !== 'admin') {
          window.location.href = '/';
          return;
        }

        this.currentUserId = user.id;
        this.loadData();
      },
      error: () => {
        this.api.logout();
        window.location.href = '/login';
      },
    });
  }

  get activeUsersCount(): number {
    return this.users.filter(user => user.is_active).length;
  }

  private emptyUserForm() {
    return {
      full_name: '',
      email: '',
      password: '',
      role: 'student' as UserRole,
      faculty_id: null as number | null,
    };
  }

  loadData(): void {
    this.loading = true;
    this.error = '';

    this.api.getUsers().subscribe({
      next: users => {
        this.users = users;

        this.api.getFaculties().subscribe({
          next: faculties => {
            this.faculties = faculties;
            this.users = this.sortUsers(this.users);
            this.loading = false;

            this.cdr.detectChanges();
          },
          error: err => {
            this.error = this.getErrorMessage(
              err,
              'Не удалось загрузить факультеты',
            );

            this.loading = false;
            this.cdr.detectChanges();
          },
        });
      },
      error: err => {
        this.error = this.getErrorMessage(
          err,
          'Не удалось загрузить пользователей',
        );

        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  private sortUsers(users: User[]): User[] {
    const collator = new Intl.Collator('ru');

    const roleGroup = (role: string): number =>
      role === 'admin' ? 0 : role === 'student' ? 2 : 1;

    const staffOrder = (role: string): number => (role === 'dean' ? 0 : 1);

    return [...users].sort((a, b) => {
      const groupDiff = roleGroup(a.role) - roleGroup(b.role);

      if (groupDiff !== 0) {
        return groupDiff;
      }

      if (a.role !== 'admin') {
        const facultyDiff = collator.compare(
          this.getFacultyName(a.faculty_id),
          this.getFacultyName(b.faculty_id),
        );

        if (facultyDiff !== 0) {
          return facultyDiff;
        }
      }

      if (roleGroup(a.role) === 1) {
        const staffDiff = staffOrder(a.role) - staffOrder(b.role);

        if (staffDiff !== 0) {
          return staffDiff;
        }
      }

      if (a.role === 'student') {
        const groupName = collator.compare(
          a.group_name ?? '',
          b.group_name ?? '',
        );

        if (groupName !== 0) {
          return groupName;
        }
      }

      return collator.compare(a.full_name, b.full_name);
    });
  }

  getRoleName(role: string): string {
    const roles: Record<string, string> = {
      student: 'Студент',
      secretary: 'Секретарь',
      dean: 'Декан',
      admin: 'Администратор',
    };

    return roles[role] || role;
  }

  getFacultyName(facultyId: number | null): string {
    if (facultyId === null) {
      return 'Не указан';
    }

    return this.faculties.find(faculty => faculty.id === facultyId)?.name
      || 'Не найден';
  }

  editUser(user: User): void {
    this.editingUserId = user.id;

    this.userForm = {
      full_name: user.full_name,
      email: user.email,
      password: '',
      role: user.role as UserRole,
      faculty_id: user.faculty_id,
    };

    this.showUserForm = true;
    this.showFacultyForm = false;
    this.activeTab = 'users';
  }

  cancelUserForm(): void {
    this.showUserForm = false;
    this.editingUserId = null;
    this.userForm = this.emptyUserForm();
  }

  saveUser(): void {
    if (!this.userForm.full_name.trim()) {
      this.error = 'Укажите ФИО пользователя';
      return;
    }

    if (!this.editingUserId && !this.userForm.email.trim()) {
      this.error = 'Укажите электронную почту';
      return;
    }

    if (!this.editingUserId && !this.userForm.password.trim()) {
      this.error = 'Укажите пароль';
      return;
    }

    this.error = '';
    this.saving = true;

    if (this.editingUserId !== null) {
      const data: UserUpdate = {
        full_name: this.userForm.full_name.trim(),
        role: this.userForm.role,
        faculty_id: this.userForm.faculty_id,
      };

      this.api.updateUser(this.editingUserId, data).subscribe({
        next: () => {
          this.cancelUserForm();
          this.saving = false;
          this.loadData();
        },
        error: err => {
          this.error = this.getErrorMessage(
            err,
            'Не удалось изменить пользователя',
          );
          this.saving = false;
        },
      });
    } else {
      const data: UserCreate = {
        full_name: this.userForm.full_name.trim(),
        email: this.userForm.email.trim(),
        password: this.userForm.password,
        role: this.userForm.role,
        faculty_id: this.userForm.faculty_id,
      };

      this.api.createUser(data).subscribe({
        next: () => {
          this.cancelUserForm();
          this.saving = false;
          this.loadData();
        },
        error: err => {
          this.error = this.getErrorMessage(
            err,
            'Не удалось создать пользователя',
          );
          this.saving = false;
        },
      });
    }
  }

  toggleUserStatus(user: User): void {
    const action = user.is_active ? 'отключить' : 'включить';

    if (!confirm(
      `Вы действительно хотите ${action} пользователя ${user.full_name}?`
    )) {
      return;
    }

    this.api.updateUser(user.id, {
      is_active: !user.is_active,
    }).subscribe({
      next: () => this.loadData(),
      error: err => {
        this.error = this.getErrorMessage(
          err,
          'Не удалось изменить статус пользователя',
        );
      },
    });
  }

  canDeleteUser(user: User): boolean {
    return user.role !== 'admin' && user.id !== this.currentUserId;
  }

  deleteUser(user: User): void {
    if (!this.canDeleteUser(user)) {
      return;
    }

    const confirmed = confirm(
      `Удалить пользователя ${user.full_name} (${user.email}) навсегда?\n\n` +
      'Будут удалены также его периоды приёма и записи студентов. ' +
      'Действие необратимо.',
    );

    if (!confirmed) {
      return;
    }

    this.error = '';
    this.success = '';

    this.api.deleteUser(user.id).subscribe({
      next: () => {
        this.success = `Пользователь ${user.full_name} удалён`;
        this.loadData();
      },
      error: err => {
        this.error = this.getErrorMessage(
          err,
          'Не удалось удалить пользователя',
        );
        this.cdr.detectChanges();
      },
    });
  }

  editFaculty(faculty: Faculty): void {
    this.editingFacultyId = faculty.id;

    this.facultyForm = {
      name: faculty.name,
    };

    this.showFacultyForm = true;
    this.showUserForm = false;
    this.activeTab = 'faculties';
  }

  cancelFacultyForm(): void {
    this.showFacultyForm = false;
    this.editingFacultyId = null;

    this.facultyForm = {
      name: '',
    };
  }

  saveFaculty(): void {
    const name = this.facultyForm.name.trim();

    if (!name) {
      this.error = 'Укажите название факультета';
      return;
    }

    this.error = '';
    this.saving = true;

    if (this.editingFacultyId !== null) {
      this.api.updateFaculty(this.editingFacultyId, {
        name,
      }).subscribe({
        next: () => {
          this.cancelFacultyForm();
          this.saving = false;
          this.loadData();
        },
        error: err => {
          this.error = this.getErrorMessage(
            err,
            'Не удалось изменить факультет',
          );
          this.saving = false;
        },
      });
    } else {
      this.api.createFaculty({ name }).subscribe({
        next: () => {
          this.cancelFacultyForm();
          this.saving = false;
          this.loadData();
        },
        error: err => {
          this.error = this.getErrorMessage(
            err,
            'Не удалось создать факультет',
          );
          this.saving = false;
        },
      });
    }
  }

  toggleFacultyStatus(faculty: Faculty): void {
    const action = faculty.is_active ? 'отключить' : 'включить';

    if (!confirm(
      `Вы действительно хотите ${action} факультет «${faculty.name}»?`
    )) {
      return;
    }

    this.api.updateFaculty(faculty.id, {
      is_active: !faculty.is_active,
    }).subscribe({
      next: () => this.loadData(),
      error: err => {
        this.error = this.getErrorMessage(
          err,
          'Не удалось изменить статус факультета',
        );
      },
    });
  }

  private getErrorMessage(err: any, fallback: string): string {
    const detail = err?.error?.detail;

    if (typeof detail === 'string') {
      return detail;
    }

    return fallback;
  }

  logout(): void {
    this.api.logout();
    window.location.href = '/login';
  }
}
