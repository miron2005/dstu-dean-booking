
import {
  Component,
  OnInit,
  inject,
  ChangeDetectorRef,
} from '@angular/core';

import { RouterLink, Router } from '@angular/router';

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
  private readonly cdr = inject(ChangeDetectorRef);

  // Ключ для хранения прочитанных уведомлений в браузере
  private readonly readNotificationsKey = 'read_student_notifications';

  user: User | null = null;
  appointments: StudentAppointment[] = [];
  notifications: StudentNotification[] = [];
  periods: ReceptionPeriod[] = [];

  loading = true;
  errorMessage = '';

  ngOnInit(): void {
    console.log('1. StudentDashboard запущен');

    if (!this.api.getToken()) {
      this.router.navigate(['/login']);
      return;
    }

    // Загружаем данные пользователя
    this.api.getMe().subscribe({
      next: (user) => {
        console.log('2. Получены данные пользователя:', user);

        this.user = user;
        this.loading = false;
        this.cdr.detectChanges();

        console.log('3. Значение loading:', this.loading);
      },
      error: (error) => {
        console.error('Ошибка загрузки пользователя:', error);

        this.loading = false;
        this.cdr.detectChanges();

        if (error.status === 401) {
          this.api.logout();
          this.router.navigate(['/login']);
          return;
        }

        this.errorMessage = 'Не удалось загрузить данные пользователя.';
        this.cdr.detectChanges();
      },
    });

    // Загружаем записи студента
    this.api.getMyAppointments().subscribe({
      next: (appointments) => {
        console.log('Записи студента получены:', appointments);

        this.appointments = appointments;
        this.cdr.detectChanges();

        console.log('Количество записей:', this.appointments.length);
      },
      error: (error) => {
        console.error('Ошибка загрузки записей:', error);
      },
    });

    // Загружаем уведомления
    this.api.getNotifications().subscribe({
      next: (notifications) => {
        const readIds = this.getReadNotificationIds();

        this.notifications = notifications.map((notification) => {
          if (readIds.includes(notification.id)) {
            return {
              ...notification,
              read_at: notification.read_at || new Date().toISOString(),
            };
          }

          return notification;
        });

        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Ошибка загрузки уведомлений:', error);
      },
    });

    // Загружаем периоды приёма
    this.api.getPeriods().subscribe({
      next: (periods) => {
        console.log('Периоды приёма получены:', periods);

        this.periods = periods;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Ошибка загрузки периодов:', error);
      },
    });
  }

  // Получаем список ID прочитанных уведомлений
  private getReadNotificationIds(): number[] {
    const saved = localStorage.getItem(this.readNotificationsKey);

    if (!saved) {
      return [];
    }

    try {
      const parsed: unknown = JSON.parse(saved);

      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed.filter(
        (id): id is number => typeof id === 'number',
      );
    } catch {
      return [];
    }
  }

  // Сохраняем прочитанное уведомление
  private saveReadNotificationIds(ids: number[]): void {
    localStorage.setItem(
      this.readNotificationsKey,
      JSON.stringify(ids),
    );
  }

  // Отмечаем одно уведомление как прочитанное
  markNotificationAsRead(notification: StudentNotification): void {
    if (notification.read_at !== null) {
      return;
    }

    const readIds = this.getReadNotificationIds();

    if (!readIds.includes(notification.id)) {
      readIds.push(notification.id);
      this.saveReadNotificationIds(readIds);
    }

    notification.read_at = new Date().toISOString();

    this.cdr.detectChanges();
  }

  // Отмечаем все уведомления как прочитанные
  markAllNotificationsAsRead(): void {
    const readIds = this.getReadNotificationIds();

    this.notifications.forEach((notification) => {
      if (notification.read_at === null) {
        notification.read_at = new Date().toISOString();
      }

      if (!readIds.includes(notification.id)) {
        readIds.push(notification.id);
      }
    });

    this.saveReadNotificationIds(readIds);

    this.cdr.detectChanges();
  }

  // Открываем уведомления через кнопку сверху
  openNotifications(): void {
    this.markAllNotificationsAsRead();
    this.scrollToNotifications();
  }

  // Плавная прокрутка к уведомлениям
  scrollToNotifications(): void {
    document.getElementById('notifications')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }

  logout(): void {
    this.api.logout();
    this.router.navigate(['/login']);
  }

  trackById(_index: number, item: { id: number }): number {
    return item.id;
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
    return this.user?.full_name || 'Студент';
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
      active: 'Ожидает приёма',
      called: 'Вызван',
      pending: 'Ожидает подтверждения',
      confirmed: 'Подтверждена',
      accepted: 'Приём состоялся',
      completed: 'Завершена',
      cancelled: 'Отменена',
      canceled: 'Отменена',
      no_show: 'Не явился',
    };

    return labels[status] ?? status;
  }
}
