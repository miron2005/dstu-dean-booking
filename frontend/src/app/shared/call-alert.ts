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

import { ApiService, StudentAppointment } from '../core/api';

const POLL_INTERVAL_MS = 3000;
const DISMISSED_KEY = 'dismissed_call_alerts';
const TITLE_ALERT = 'Вас вызвали! — ДГТУ';

@Component({
  selector: 'app-call-alert',
  standalone: true,
  imports: [DatePipe],
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
  `],
})
export class CallAlert implements OnInit, OnDestroy {
  @Output() changed = new EventEmitter<StudentAppointment[]>();

  private readonly api = inject(ApiService);
  private readonly cdr = inject(ChangeDetectorRef);

  calls: StudentAppointment[] = [];

  private timer: ReturnType<typeof setInterval> | null = null;
  private lastSignature: string | null = null;
  private lastAppointments: StudentAppointment[] = [];
  private dismissed = this.readDismissed();
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
    this.saveDismissed();
    this.refreshCalls();
    this.cdr.detectChanges();
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
      },
      error: (error) => {
        if (error.status === 401 && this.timer !== null) {
          clearInterval(this.timer);
          this.timer = null;
        }
      },
    });
  }

  private refreshCalls(): void {
    this.calls = this.lastAppointments.filter(
      (appointment) =>
        appointment.status === 'called' && !this.dismissed.has(appointment.id),
    );

    document.title = this.calls.length > 0 ? TITLE_ALERT : this.originalTitle;
  }

  private readDismissed(): Set<number> {
    try {
      const parsed: unknown = JSON.parse(
        sessionStorage.getItem(DISMISSED_KEY) ?? '[]',
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

  private saveDismissed(): void {
    try {
      sessionStorage.setItem(DISMISSED_KEY, JSON.stringify([...this.dismissed]));
    } catch {
      /* хранилище недоступно, окно просто покажется снова */
    }
  }
}
