import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService, ReceptionPeriod, User } from '../../core/api';

@Component({
  selector: 'app-secretary-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './secretary-dashboard.html',
  styleUrl: './secretary-dashboard.css',
})
export class SecretaryDashboard implements OnInit {
  user: User | null = null;
  periods: ReceptionPeriod[] = [];

  loading = false;
  saving = false;
  errorMessage = '';
  successMessage = '';

  editingId: number | null = null;

  form = {
    dean_id: 0,
    starts_at: '',
    ends_at: '',
    capacity: 10,
  };

  constructor(
    private api: ApiService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    if (!this.api.getToken()) {
      this.router.navigate(['/login']);
      return;
    }

    this.api.getMe().subscribe({
      next: (user) => {
        if (user.role !== 'secretary') {
          this.router.navigate(['/']);
          return;
        }

        this.user = user;
        this.loadPeriods();
      },
      error: () => {
        this.api.logout();
        this.router.navigate(['/login']);
      },
    });
  }

  loadPeriods(): void {
    this.loading = true;
    this.errorMessage = '';

    this.api.getPeriods().subscribe({
      next: (periods) => {
        this.periods = periods;
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Не удалось загрузить периоды приёма';
        this.loading = false;
      },
    });
  }

  submitForm(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (
      !this.form.dean_id ||
      !this.form.starts_at ||
      !this.form.ends_at ||
      this.form.capacity < 1
    ) {
      this.errorMessage = 'Заполните все поля корректно';
      return;
    }

    const startsAt = new Date(this.form.starts_at);
    const endsAt = new Date(this.form.ends_at);

    if (endsAt <= startsAt) {
      this.errorMessage = 'Время окончания должно быть позже начала';
      return;
    }

    const data = {
      dean_id: Number(this.form.dean_id),
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      capacity: Number(this.form.capacity),
    };

    this.saving = true;

    const request = this.editingId
      ? this.api.updatePeriod(this.editingId, data)
      : this.api.createPeriod(data);

    request.subscribe({
      next: () => {
        this.successMessage = this.editingId
          ? 'Период приёма обновлён'
          : 'Период приёма создан';

        this.resetForm();
        this.loadPeriods();
        this.saving = false;
      },
      error: (error) => {
        this.errorMessage =
          error.error?.detail || 'Не удалось сохранить период приёма';
        this.saving = false;
      },
    });
  }

  editPeriod(period: ReceptionPeriod): void {
    this.editingId = period.id;

    this.form = {
      dean_id: period.dean_id,
      starts_at: this.toLocalDateTime(period.starts_at),
      ends_at: this.toLocalDateTime(period.ends_at),
      capacity: period.capacity,
    };

    this.successMessage = '';
    this.errorMessage = '';

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelPeriod(period: ReceptionPeriod): void {
    const confirmed = window.confirm(
      'Вы действительно хотите отменить этот период приёма?',
    );

    if (!confirmed) {
      return;
    }

    this.api.cancelPeriod(period.id).subscribe({
      next: () => {
        this.successMessage = 'Период приёма отменён';
        this.loadPeriods();
      },
      error: (error) => {
        this.errorMessage =
          error.error?.detail || 'Не удалось отменить период';
      },
    });
  }

  resetForm(): void {
    this.editingId = null;

    this.form = {
      dean_id: 0,
      starts_at: '',
      ends_at: '',
      capacity: 10,
    };
  }

  logout(): void {
    this.api.logout();
    this.router.navigate(['/login']);
  }

  getStatusLabel(status: string): string {
    const statuses: Record<string, string> = {
      active: 'Активен',
      cancelled: 'Отменён',
      completed: 'Завершён',
      closed: 'Закрыт',
    };

    return statuses[status] || status;
  }

  private toLocalDateTime(value: string): string {
    const date = new Date(value);
    const offset = date.getTimezoneOffset();

    return new Date(date.getTime() - offset * 60000)
      .toISOString()
      .slice(0, 16);
  }
}