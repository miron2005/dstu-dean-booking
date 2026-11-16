
import {
  Component,
  OnInit,
  inject,
  ChangeDetectorRef,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';

import {
  ApiService,
  User,
  AppealTopic,
  ReceptionPeriod,
  StudentAppointment,
  StudentNotification,
} from '../../core/api';
import { RoleAvatar } from '../../shared/role-avatar';
import { CallAlert } from '../../shared/call-alert';

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [RouterLink, FormsModule, RoleAvatar, CallAlert],
  templateUrl: './student-dashboard.html',
  styleUrl: './student-dashboard.css',
})
export class StudentDashboard implements OnInit {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  private readonly readNotificationsKey = 'read_student_notifications';

  user: User | null = null;
  appointments: StudentAppointment[] = [];
  notifications: StudentNotification[] = [];
  periods: ReceptionPeriod[] = [];
  topics: AppealTopic[] = [];

  editingProfile = false;
  profileName = '';
  profileGroup = '';
  profileSaving = false;
  profileError = '';

  loading = true;
  errorMessage = '';

  ngOnInit(): void {

    if (!this.api.getToken()) {
      this.router.navigate(['/login']);
      return;
    }

    this.api.getMe().subscribe({
      next: (user) => {

        this.user = user;
        this.loading = false;
        this.cdr.detectChanges();

        if (user.faculty_id != null) {
          this.loadTopics(user.faculty_id);
        }

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

    this.loadAppointments();
    this.loadNotifications();

    this.api.getPeriods().subscribe({
      next: (periods) => {

        this.periods = periods;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Ошибка загрузки периодов:', error);
      },
    });
  }

  loadAppointments(): void {
    this.api.getMyAppointments().subscribe({
      next: (appointments) => {
        this.appointments = appointments;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Ошибка загрузки записей:', error);
      },
    });
  }

  loadNotifications(): void {
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
  }

  onAppointmentsChanged(): void {
    this.loadAppointments();
    this.loadNotifications();
  }

  private loadTopics(facultyId: number): void {
    this.api.getTopics(facultyId).subscribe({
      next: (topics) => {
        this.topics = topics;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Ошибка загрузки тем:', error);
      },
    });
  }

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

  private saveReadNotificationIds(ids: number[]): void {
    localStorage.setItem(
      this.readNotificationsKey,
      JSON.stringify(ids),
    );
  }

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

  openNotifications(): void {
    this.markAllNotificationsAsRead();
    this.scrollToNotifications();
  }

  scrollToNotifications(): void {
    document.getElementById('notifications')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }

  scrollToAppointments(): void {
    document.getElementById('appointments')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }

  scrollToProfile(): void {
    document.getElementById('profile')?.scrollIntoView({
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

  get visibleAppointments(): StudentAppointment[] {
    return this.appointments.filter(
      (appointment) =>
        appointment.status === 'active' ||
        appointment.status === 'called',
    );
  }

  get upcomingAppointments(): StudentAppointment[] {
    return this.appointments.filter(
      (appointment) =>
        appointment.status === 'called' ||
        (appointment.status === 'active' &&
          this.getStartTime(appointment) > Date.now()),
    );
  }

  get completedAppointments(): StudentAppointment[] {
    return this.appointments.filter(
      (appointment) =>
        appointment.status === 'accepted' ||
        appointment.status === 'no_show',
    );
  }

  get unreadNotifications(): number {
    return this.notifications.filter(
      (notification) => notification.read_at === null,
    ).length;
  }

  get nextAppointment(): StudentAppointment | null {
    const called = this.upcomingAppointments.find(
      (appointment) => appointment.status === 'called',
    );

    if (called) {
      return called;
    }

    const sorted = [...this.upcomingAppointments].sort(
      (a, b) => this.getStartTime(a) - this.getStartTime(b),
    );

    return sorted[0] ?? null;
  }

  private getStartTime(appointment: StudentAppointment): number {
    return appointment.slot_start
      ? new Date(appointment.slot_start).getTime()
      : 0;
  }

  getTopicTitle(appointment: StudentAppointment): string {
    if (appointment.topic_id == null) {
      return 'Другое';
    }

    return (
      this.topics.find((topic) => topic.id === appointment.topic_id)?.title ??
      'Тема обращения'
    );
  }

  startProfileEdit(): void {
    this.profileName = this.user?.full_name ?? '';
    this.profileGroup = this.user?.group_name ?? '';
    this.profileError = '';
    this.editingProfile = true;
  }

  cancelProfileEdit(): void {
    this.editingProfile = false;
    this.profileError = '';
  }

  saveProfile(): void {
    const fullName = this.profileName.trim();
    const groupName = this.profileGroup.trim();

    if (!fullName || !groupName) {
      this.profileError = 'Укажите ФИО и группу.';
      return;
    }

    this.profileSaving = true;
    this.profileError = '';

    this.api.updateMe({ full_name: fullName, group_name: groupName }).subscribe({
      next: (user) => {
        this.user = user;
        this.editingProfile = false;
        this.profileSaving = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.profileError =
          typeof error.error?.detail === 'string'
            ? error.error.detail
            : 'Не удалось сохранить профиль.';
        this.profileSaving = false;
        this.cdr.detectChanges();
      },
    });
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

  formatDate(value: string | null | undefined): string {
    if (!value) return 'Дата не указана';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return 'Дата не указана';

    return new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  }

  formatTime(value: string | null | undefined): string {
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
