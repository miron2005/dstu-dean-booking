import {
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import {
  ApiService,
  AppealTopic,
  StudentAppointment,
  User,
} from '../../core/api';
import { RoleAvatar } from '../../shared/role-avatar';

type AppointmentFilter = 'all' | 'upcoming' | 'done' | 'cancelled';

@Component({
  selector: 'app-my-appointments',
  standalone: true,
  imports: [RouterLink, RoleAvatar],
  templateUrl: './my-appointments.html',
  styleUrl: './my-appointments.css',
})
export class MyAppointments implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  user: User | null = null;
  appointments: StudentAppointment[] = [];
  topics: AppealTopic[] = [];

  filter: AppointmentFilter = 'all';

  loading = true;
  cancellingId: number | null = null;

  errorMessage = '';
  successMessage = '';

  ngOnInit(): void {
    if (!this.api.getToken()) {
      this.router.navigate(['/login']);
      return;
    }

    this.api.getMe().subscribe({
      next: (user) => {
        this.user = user;

        if (user.faculty_id != null) {
          this.api.getTopics(user.faculty_id).subscribe({
            next: (topics) => {
              this.topics = topics;
              this.cdr.detectChanges();
            },
            error: () => this.cdr.detectChanges(),
          });
        }

        this.loadAppointments();
      },
      error: (error) => {
        if (error.status === 401) {
          this.api.logout();
          this.router.navigate(['/login']);
          return;
        }

        this.errorMessage = 'Не удалось загрузить профиль пользователя.';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  loadAppointments(): void {
    this.api.getMyAppointments().subscribe({
      next: (appointments) => {
        this.appointments = [...appointments].sort(
          (a, b) => this.getStartTime(b) - this.getStartTime(a),
        );
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.errorMessage = this.readError(
          error,
          'Не удалось загрузить список записей.',
        );
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  get upcoming(): StudentAppointment[] {
    return this.appointments.filter(
      (appointment) =>
        appointment.status === 'active' || appointment.status === 'called',
    );
  }

  get done(): StudentAppointment[] {
    return this.appointments.filter(
      (appointment) =>
        appointment.status === 'accepted' || appointment.status === 'no_show',
    );
  }

  get cancelled(): StudentAppointment[] {
    return this.appointments.filter(
      (appointment) => appointment.status === 'cancelled',
    );
  }

  get visibleAppointments(): StudentAppointment[] {
    switch (this.filter) {
      case 'upcoming':
        return this.upcoming;
      case 'done':
        return this.done;
      case 'cancelled':
        return this.cancelled;
      default:
        return this.appointments;
    }
  }

  setFilter(filter: AppointmentFilter): void {
    this.filter = filter;
  }

  canCancel(appointment: StudentAppointment): boolean {
    return (
      appointment.status === 'active' &&
      this.getStartTime(appointment) > Date.now()
    );
  }

  cancel(appointment: StudentAppointment): void {
    if (this.cancellingId !== null) {
      return;
    }

    if (!window.confirm('Отменить эту запись? Время освободится для других студентов.')) {
      return;
    }

    this.cancellingId = appointment.id;
    this.errorMessage = '';
    this.successMessage = '';

    this.api.cancelAppointment(appointment.id).subscribe({
      next: () => {
        this.successMessage = 'Запись отменена.';
        this.cancellingId = null;
        this.loadAppointments();
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.errorMessage = this.readError(
          error,
          'Не удалось отменить запись.',
        );
        this.cancellingId = null;
        this.cdr.detectChanges();
        this.loadAppointments();
      },
    });
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

  getDay(appointment: StudentAppointment): string {
    return appointment.slot_start
      ? new Date(appointment.slot_start).getDate().toString()
      : '–';
  }

  getMonth(appointment: StudentAppointment): string {
    return appointment.slot_start
      ? new Intl.DateTimeFormat('ru-RU', { month: 'long' }).format(
          new Date(appointment.slot_start),
        )
      : '';
  }

  getTime(appointment: StudentAppointment): string {
    return appointment.slot_start
      ? new Intl.DateTimeFormat('ru-RU', {
          hour: '2-digit',
          minute: '2-digit',
        }).format(new Date(appointment.slot_start))
      : '';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      active: 'Ожидает приёма',
      called: 'Вызван',
      accepted: 'Приём состоялся',
      no_show: 'Не явился',
      cancelled: 'Отменена',
    };

    return labels[status] ?? status;
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      active: 'pending',
      called: 'confirmed',
      accepted: 'completed',
      no_show: 'cancelled',
      cancelled: 'cancelled',
    };

    return classes[status] ?? 'pending';
  }

  logout(): void {
    this.api.logout();
    this.router.navigate(['/login']);
  }

  trackById(_index: number, appointment: StudentAppointment): number {
    return appointment.id;
  }

  private getStartTime(appointment: StudentAppointment): number {
    return appointment.slot_start
      ? new Date(appointment.slot_start).getTime()
      : 0;
  }

  private readError(
    error: { error?: { detail?: unknown } },
    fallback: string,
  ): string {
    const detail = error.error?.detail;

    return typeof detail === 'string' ? detail : fallback;
  }
}
