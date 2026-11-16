import { DatePipe } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  OnDestroy,
  OnInit,
  Output,
  inject,
} from '@angular/core';

import { RouterLink } from '@angular/router';

import {
  ApiService,
  StudentAppointment,
  StudentNotification,
} from '../core/api';

interface CancelAlert {
  notification: StudentNotification;
  appointment: StudentAppointment | undefined;
}

const POLL_INTERVAL_MS = 3000;
const DISMISSED_KEY = 'dismissed_call_alerts';
const DISMISSED_CANCEL_KEY = 'dismissed_cancel_alerts';
const TITLE_ALERT = 'Вас вызвали! — ДГТУ';
const TITLE_CANCEL = 'Приём отменён — ДГТУ';

@Component({
  selector: 'app-call-alert',
  standalone: true,
  imports: [DatePipe, RouterLink],
  template: `
    @for (call of calls; track call.id) {
      <div class="call-overlay" role="alertdialog" aria-modal="true">
        <div class="call-card">
          <div class="call-pulse" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.7 21a2 2 0 0 1-3.4 0" />
            </svg>
          </div>

          <h2>Вас вызвали на приём!</h2>

          <p class="call-lead">
            Пройдите в аудиторию
            <strong>{{ call.room || 'уточните у секретаря' }}</strong>
          </p>

          <dl class="call-details">
            <div>
              <dt>Декан</dt>
              <dd>{{ call.dean_name }}</dd>
            </div>

            <div>
              <dt>Аудитория</dt>
              <dd>{{ call.room || 'не указана' }}</dd>
            </div>

            @if (call.slot_start) {
              <div>
                <dt>Время приёма</dt>
                <dd>{{ call.slot_start | date: 'HH:mm' }}</dd>
              </div>
            }
          </dl>

          <button type="button" class="call-button" (click)="dismiss(call)">
            Понятно, иду
          </button>
        </div>
      </div>
    }

    @for (item of cancels; track item.notification.id) {
      <div class="call-overlay" role="alertdialog" aria-modal="true">
        <div class="call-card cancel-card">
          <div class="call-pulse cancel-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="17" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
              <path d="m9.5 14.5 5 5M14.5 14.5l-5 5" />
            </svg>
          </div>

          <h2>Приём отменён</h2>

          <p class="call-lead">{{ item.notification.message }}</p>

          @if (item.appointment; as appointment) {
            <dl class="call-details">
              <div>
                <dt>Декан</dt>
                <dd>{{ appointment.dean_name }}</dd>
              </div>

              @if (appointment.slot_start) {
                <div>
                  <dt>Дата и время</dt>
                  <dd>{{ appointment.slot_start | date: 'dd.MM.yyyy, HH:mm' }}</dd>
                </div>
              }

              <div>
                <dt>Аудитория</dt>
                <dd>{{ appointment.room || 'не указана' }}</dd>
              </div>
            </dl>
          }

          <button
            type="button"
            class="call-button"
            routerLink="/student/new-appointment"
            (click)="dismissCancel(item)"
          >
            Выбрать другое время
          </button>

          <button type="button" class="call-link" (click)="dismissCancel(item)">
            Закрыть
          </button>
        </div>
      </div>
    }
  `,
  styles: [`
    .call-overlay {
      position: fixed;
      inset: 0;
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      background: rgba(17, 24, 39, 0.65);
    }

    .call-card {
      width: 100%;
      max-width: 460px;
      padding: 32px 28px 28px;
      border-top: 6px solid #b9954f;
      border-radius: 16px;
      background: #ffffff;
      text-align: center;
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
    }

    .call-pulse {
      width: 68px;
      height: 68px;
      margin: 0 auto 16px;
      padding: 16px;
      border-radius: 50%;
      background: #f3ead8;
      color: #8a6a2f;
      animation: call-pulse 1.4s ease-in-out infinite;
    }

    .call-pulse svg {
      width: 100%;
      height: 100%;
    }

    @keyframes call-pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(185, 149, 79, 0.55); }
      50% { box-shadow: 0 0 0 14px rgba(185, 149, 79, 0); }
    }

    h2 {
      margin: 0 0 10px;
      font-size: 24px;
    }

    .call-lead {
      margin: 0 0 20px;
      color: #4b5563;
      font-size: 17px;
    }

    .call-details {
      display: grid;
      gap: 10px;
      margin: 0 0 24px;
      padding: 16px;
      border-radius: 12px;
      background: #f6f4ef;
      text-align: left;
    }

    .call-details div {
      display: flex;
      justify-content: space-between;
      gap: 16px;
    }

    dt {
      color: #6b7280;
    }

    dd {
      margin: 0;
      font-weight: 600;
      text-align: right;
    }

    .call-button {
      width: 100%;
      padding: 14px;
      border: none;
      border-radius: 12px;
      background: #b9954f;
      color: #ffffff;
      font: inherit;
      font-size: 17px;
      font-weight: 600;
      cursor: pointer;
    }

    .call-button:hover {
      background: #a3813f;
    }

    .cancel-card {
      border-top-color: #9b2c2c;
    }

    .cancel-icon {
      background: #f3e8e8;
      color: #9b2c2c;
      animation: none;
    }

    .call-link {
      width: 100%;
      margin-top: 10px;
      padding: 10px;
      border: none;
      background: none;
      color: #6b7280;
      font: inherit;
      cursor: pointer;
      text-decoration: underline;
    }
  `],
})
export class CallAlert implements OnInit, OnDestroy {
  @Output() changed = new EventEmitter<StudentAppointment[]>();

  private readonly api = inject(ApiService);
  private readonly cdr = inject(ChangeDetectorRef);

  calls: StudentAppointment[] = [];
  cancels: CancelAlert[] = [];

  private timer: ReturnType<typeof setInterval> | null = null;
  private lastSignature: string | null = null;
  private lastAppointments: StudentAppointment[] = [];
  private dismissed = this.readDismissed(DISMISSED_KEY);
  private dismissedCancels = this.readDismissed(DISMISSED_CANCEL_KEY);
  private notifications: StudentNotification[] = [];
  private originalTitle = document.title;

  ngOnInit(): void {
    if (!this.api.getToken()) {
      return;
    }

    this.poll();
    this.timer = setInterval(() => this.poll(), POLL_INTERVAL_MS);
  }

  ngOnDestroy(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
    }

    document.title = this.originalTitle;
  }

  dismiss(call: StudentAppointment): void {
    this.dismissed.add(call.id);
    this.saveDismissed(DISMISSED_KEY, this.dismissed);
    this.refreshCalls();
    this.cdr.detectChanges();
  }

  dismissCancel(item: CancelAlert): void {
    this.dismissedCancels.add(item.notification.id);
    this.saveDismissed(DISMISSED_CANCEL_KEY, this.dismissedCancels);
    this.refreshCalls();
    this.cdr.detectChanges();

    this.api.markNotificationRead(item.notification.id).subscribe({
      error: () => {
        /* не критично: окно уже закрыто и больше не покажется в этой сессии */
      },
    });
  }

  private poll(): void {
    this.api.getMyAppointments().subscribe({
      next: (appointments) => {
        const signature = appointments
          .map((appointment) => `${appointment.id}:${appointment.status}`)
          .join('|');

        const isChange =
          this.lastSignature !== null && signature !== this.lastSignature;

        this.lastSignature = signature;
        this.lastAppointments = appointments;
        this.refreshCalls();
        this.cdr.detectChanges();

        if (isChange) {
          this.changed.emit(appointments);
        }

        this.pollCancellations();
      },
      error: (error) => {
        if (error.status === 401 && this.timer !== null) {
          clearInterval(this.timer);
          this.timer = null;
        }
      },
    });
  }

  private pollCancellations(): void {
    this.api.getNotifications().subscribe({
      next: (notifications) => {
        this.notifications = notifications;
        this.refreshCalls();
        this.cdr.detectChanges();
      },
      error: () => {
        /* повторим при следующем опросе */
      },
    });
  }

  private refreshCalls(): void {
    this.calls = this.lastAppointments.filter(
      (appointment) =>
        appointment.status === 'called' && !this.dismissed.has(appointment.id),
    );

    this.cancels = this.notifications
      .filter(
        (notification) =>
          notification.kind === 'period_cancelled' &&
          notification.read_at === null &&
          !this.dismissedCancels.has(notification.id),
      )
      .map((notification) => ({
        notification,
        appointment: this.lastAppointments.find(
          (appointment) => appointment.id === notification.appointment_id,
        ),
      }));

    document.title =
      this.calls.length > 0
        ? TITLE_ALERT
        : this.cancels.length > 0
          ? TITLE_CANCEL
          : this.originalTitle;
  }

  private readDismissed(key: string): Set<number> {
    try {
      const parsed: unknown = JSON.parse(
        sessionStorage.getItem(key) ?? '[]',
      );

      return new Set(
        Array.isArray(parsed)
          ? parsed.filter((id): id is number => typeof id === 'number')
          : [],
      );
    } catch {
      return new Set();
    }
  }

  private saveDismissed(key: string, ids: Set<number>): void {
    try {
      sessionStorage.setItem(key, JSON.stringify([...ids]));
    } catch {
      /* хранилище недоступно, окно просто покажется снова */
    }
  }
}
