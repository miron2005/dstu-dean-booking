
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { forkJoin } from 'rxjs';

import {
  ApiService,
  User,
  ReceptionPeriod,
  StudentAppointment,
  StudentNotification,
} from '../../core/api';

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './student-dashboard.html',
  styleUrl: './student-dashboard.css',
})
export class StudentDashboard implements OnInit {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  user: User | null = null;
  appointments: StudentAppointment[] = [];
  notifications: StudentNotification[] = [];
  periods: ReceptionPeriod[] = [];

  loading = true;
  errorMessage = '';

  ngOnInit(): void {
    if (!this.api.getToken()) {
      this.router.navigate(['/login']);
      return;
    }

    forkJoin({
      user: this.api.getMe(),
      appointments: this.api.getMyAppointments(),
      notifications: this.api.getNotifications(),
      periods: this.api.getPeriods(),
    }).subscribe({
      next: (data) => {
        this.user = data.user;
        this.appointments = data.appointments;
        this.notifications = data.notifications;
        this.periods = data.periods;
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;

        console.error('Ошибка загрузки личного кабинета:', error);

        if (error.status === 401) {
          this.api.logout();
          this.router.navigate(['/login']);
          return;
        }

        this.errorMessage =
          'Не удалось загрузить данные личного кабинета. Попробуйте обновить страницу.';
      },
    });
  }

  get totalAppointments(): number {
    return this.appointments.length;
  }

  get upcomingAppointments(): StudentAppointment[] {
    return this.appointments.filter((appointment) => {
      const period = this.getPeriod(appointment.period_id);

      return period
        ? new Date(period.starts_at).getTime() > Date.now()
        : false;
    });
  }

  get completedAppointments(): StudentAppointment[] {
    return this.appointments.filter((appointment) => {
      const period = this.getPeriod(appointment.period_id);

      return period
        ? new Date(period.ends_at).getTime() < Date.now()
        : false;
    });
  }

  get unreadNotifications(): number {
    return this.notifications.filter(
      (notification) => notification.read_at === null,
    ).length;
  }

  get nextAppointment(): StudentAppointment | null {
    const sorted = [...this.upcomingAppointments].sort((a, b) => {
      const periodA = this.getPeriod(a.period_id);
      const periodB = this.getPeriod(b.period_id);

      return (
        new Date(periodA?.starts_at ?? 0).getTime() -
        new Date(periodB?.starts_at ?? 0).getTime()
      );
    });

    return sorted[0] ?? null;
  }

  getPeriod(periodId: number): ReceptionPeriod | undefined {
    return this.periods.find((period) => period.id === periodId);
  }

  get studentName(): string {
    return this.user?.full_name ?? 'Студент';
  }

  get initials(): string {
    const parts = this.studentName.trim().split(/\s+/);

    return parts
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase();
  }

  formatDate(value: string | undefined): string {
    if (!value) return 'Дата не указана';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return 'Дата не указана';

    return new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  }

  formatTime(value: string | undefined): string {
    if (!value) return '';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return '';

    return new Intl.DateTimeFormat('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'Ожидает подтверждения',
      confirmed: 'Подтверждена',
      accepted: 'Приём состоялся',
      completed: 'Завершена',
      cancelled: 'Отменена',
      canceled: 'Отменена',
      no_show: 'Неявка',
    };

    return labels[status] ?? status;
  }

  trackById(_index: number, item: { id: number }): number {
    return item.id;
  }

  logout(): void {
    this.api.logout();
    this.router.navigate(['/login']);
  }
}
