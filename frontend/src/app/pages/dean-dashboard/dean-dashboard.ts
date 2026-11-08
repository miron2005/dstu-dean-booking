
import { Component, OnInit, inject } from '@angular/core';
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

  user: User | null = null;
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

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading = true;
    this.errorMessage = '';

    this.api.getMe().subscribe({
      next: (user) => {
        this.user = user;
      },
      error: () => {
        this.errorMessage =
          'Не удалось загрузить данные пользователя.';
      },
    });

    this.api.getPeriods().subscribe({
      next: (periods) => {
        this.periods = periods;
        this.loading = false;

        if (periods.length > 0) {
          this.selectPeriod(periods[0]);
        }
      },
      error: () => {
        this.loading = false;
        this.errorMessage =
          'Не удалось загрузить приёмные периоды. Проверьте авторизацию.';
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
      },
      error: () => {
        this.queue = [];
        this.queueLoading = false;
        this.errorMessage = 'Не удалось загрузить очередь.';
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
      },
      error: (error) => {
        this.actionLoading = false;
        this.errorMessage =
          error.error?.detail ||
          'Не удалось вызвать следующего студента.';
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
      },
      error: (error) => {
        this.actionLoading = false;
        this.errorMessage =
          error.error?.detail ||
          'Не удалось сохранить результат.';
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

  logout(): void {
    this.api.logout();
    window.location.href = '/login';
  }
}
