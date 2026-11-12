
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  ApiService,
  User,
  ReceptionPeriod,
  QueueItem,
} from '../../core/api';

@Component({
  selector: 'app-dean-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dean-dashboard.html',
  styleUrl: './dean-dashboard.css',
})
export class DeanDashboard implements OnInit {
  private api = inject(ApiService);
  private cdr = inject(ChangeDetectorRef);

  user: User | null = null;
  userLoading = true;

  periods: ReceptionPeriod[] = [];
  queue: QueueItem[] = [];

  selectedPeriod: ReceptionPeriod | null = null;
  selectedAppointment: QueueItem | null = null;

  resultComment = '';

  loading = false;
  queueLoading = false;
  actionLoading = false;

  errorMessage = '';
  successMessage = '';

  get deanName(): string {
    return this.user?.full_name?.trim() || '';
  }

  get deanInitial(): string {
    return this.deanName
      ? this.deanName.charAt(0).toUpperCase()
      : 'Д';
  }

  ngOnInit(): void {
    if (!this.api.getToken()) {
      window.location.href = '/login';
      return;
    }

    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading = true;
    this.userLoading = true;
    this.errorMessage = '';

    // Загружаем профиль пользователя
    this.api.getMe().subscribe({
      next: (user) => {
        this.user = user;
        this.userLoading = false;
        this.cdr.detectChanges();

        if (user.role !== 'dean') {
          this.api.logout();
          window.location.href = '/login';
        }
      },
      error: (error) => {
        this.user = null;
        this.userLoading = false;

        console.error('Ошибка загрузки профиля декана:', error);

        if (error.status === 401) {
          this.api.logout();
          window.location.href = '/login';
          return;
        }

        this.errorMessage =
          'Не удалось загрузить профиль пользователя. Попробуйте обновить страницу.';
        this.cdr.detectChanges();
      },
    });

    // Загружаем приёмные периоды
    this.api.getPeriods().subscribe({
      next: (periods) => {
        this.periods = periods;
        this.loading = false;

        if (periods.length > 0) {
          this.selectPeriod(periods[0]);
        }

        this.cdr.detectChanges();
      },
      error: (error) => {
        this.loading = false;

        console.error('Ошибка загрузки приёмных периодов:', error);

        if (error.status === 401) {
          this.api.logout();
          window.location.href = '/login';
          return;
        }

        this.errorMessage =
          'Не удалось загрузить приёмные периоды. Проверьте подключение к серверу.';
        this.cdr.detectChanges();
      },
    });
  }

  selectPeriod(period: ReceptionPeriod): void {
    this.selectedPeriod = period;
    this.selectedAppointment = null;
    this.resultComment = '';

    this.loadQueue(period.id);
  }

  loadQueue(periodId: number): void {
    this.queueLoading = true;
    this.errorMessage = '';

    this.api.getQueue(periodId).subscribe({
      next: (queue) => {
        this.queue = queue;
        this.queueLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.queue = [];
        this.queueLoading = false;

        console.error('Ошибка загрузки очереди:', error);

        if (error.status === 401) {
          this.api.logout();
          window.location.href = '/login';
          return;
        }

        this.errorMessage =
          error.error?.detail || 'Не удалось загрузить очередь.';
        this.cdr.detectChanges();
      },
    });
  }

  callNext(): void {
    if (!this.selectedPeriod || this.actionLoading) {
      return;
    }

    const periodId = this.selectedPeriod.id;

    this.actionLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.api.callNext(periodId).subscribe({
      next: (appointment) => {
        this.actionLoading = false;
        this.successMessage =
          `Вызван студент: ${appointment.student_name}`;

        this.loadQueue(periodId);
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.actionLoading = false;

        console.error('Ошибка вызова студента:', error);

        this.errorMessage =
          error.error?.detail ||
          'Не удалось вызвать следующего студента.';
        this.cdr.detectChanges();
      },
    });
  }

  chooseAppointment(appointment: QueueItem): void {
    this.selectedAppointment = appointment;
    this.resultComment = appointment.result_comment ?? '';
    this.errorMessage = '';
    this.successMessage = '';
  }

  saveResult(status: 'accepted' | 'no_show'): void {
    if (!this.selectedAppointment || this.actionLoading) {
      return;
    }

    const appointmentId = this.selectedAppointment.id;

    this.actionLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.api.setAppointmentResult(
      appointmentId,
      {
        status,
        result_comment: this.resultComment.trim() || null,
      },
    ).subscribe({
      next: () => {
        this.actionLoading = false;

        this.successMessage =
          status === 'accepted'
            ? 'Приём успешно завершён.'
            : 'Отсутствие студента зафиксировано.';

        this.selectedAppointment = null;
        this.resultComment = '';

        if (this.selectedPeriod) {
          this.loadQueue(this.selectedPeriod.id);
        }

        this.cdr.detectChanges();
      },
      error: (error) => {
        this.actionLoading = false;

        console.error('Ошибка сохранения результата:', error);

        this.errorMessage =
          error.error?.detail ||
          'Не удалось сохранить результат.';
        this.cdr.detectChanges();
      },
    });
  }

  get activeCount(): number {
    return this.queue.filter(
      (item) => item.status === 'active',
    ).length;
  }

  get calledCount(): number {
    return this.queue.filter(
      (item) => item.status === 'called',
    ).length;
  }

  get canFinishAppointment(): boolean {
    return this.selectedAppointment?.status === 'called';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      active: 'Ожидает',
      called: 'Вызван',
      accepted: 'Принят',
      no_show: 'Не явился',
      cancelled: 'Отменён',
    };

    return labels[status] ?? status;
  }

  // Идентификация приёмных периодов в списке
  trackByPeriodId(index: number, period: ReceptionPeriod): number {
    return period.id;
  }

  // Идентификация записей студентов в очереди
  trackByQueueId(index: number, appointment: QueueItem): number {
    return appointment.id;
  }

  logout(): void {
    this.api.logout();
    window.location.href = '/login';
  }
}
