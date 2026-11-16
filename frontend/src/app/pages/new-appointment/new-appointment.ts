import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import {
  ApiService,
  AppealTopic,
  User,
  WeekSlot,
} from '../../core/api';

interface CalendarDay {
  date: Date;
  label: string;
  slots: WeekSlot[];
}

@Component({
  selector: 'app-new-appointment',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './new-appointment.html',
  styleUrl: './new-appointment.css',
})
export class NewAppointment implements OnInit {
  private api = inject(ApiService);
  private cdr = inject(ChangeDetectorRef);

  user: User | null = null;
  topics: AppealTopic[] = [];

  weekStart = this.getMonday(new Date());
  days: CalendarDay[] = [];

  loading = true;
  saving = false;

  errorMessage = '';
  successMessage = '';

  selectedSlot: WeekSlot | null = null;
  topicValue = '';
  question = '';
  modalError = '';

  ngOnInit(): void {
    this.api.getMe().subscribe({
      next: (user) => {
        this.user = user;

        if (user.role !== 'student' || user.faculty_id == null) {
          this.errorMessage = 'Страница доступна только студентам.';
          this.loading = false;
          this.cdr.detectChanges();
          return;
        }

        this.loadTopics(user.faculty_id);
        this.loadWeek();
      },
      error: () => {
        this.errorMessage = 'Не удалось загрузить профиль пользователя.';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  get hasSlots(): boolean {
    return this.days.some((day) => day.slots.length > 0);
  }

  get freeSlotsCount(): number {
    return this.days.reduce(
      (sum, day) => sum + day.slots.filter((slot) => this.isBookable(slot)).length,
      0,
    );
  }

  get isCurrentWeek(): boolean {
    return this.weekStart.getTime() <= this.getMonday(new Date()).getTime();
  }

  get weekTitle(): string {
    const end = this.addDays(this.weekStart, 6);

    return `${this.formatShortDate(this.weekStart)} – ${this.formatShortDate(end)}`;
  }

  isBookable(slot: WeekSlot): boolean {
    return slot.is_free && !slot.is_past;
  }

  loadTopics(facultyId: number): void {
    this.api.getTopics(facultyId).subscribe({
      next: (topics) => {
        this.topics = topics.filter((topic) => topic.is_active);
        this.cdr.detectChanges();
      },
      error: () => {
        this.topics = [];
        this.cdr.detectChanges();
      },
    });
  }

  loadWeek(): void {
    this.loading = true;
    this.cdr.detectChanges();

    const dateFrom = this.toApiDate(this.addDays(this.weekStart, -1));
    const dateTo = this.toApiDate(this.addDays(this.weekStart, 7));

    this.api.getSlots(dateFrom, dateTo).subscribe({
      next: (slots) => {
        this.days = this.buildDays(slots);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.errorMessage = this.readError(
          error,
          'Не удалось загрузить календарь приёма.',
        );
        this.days = this.buildDays([]);
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  previousWeek(): void {
    if (this.isCurrentWeek) {
      return;
    }

    this.weekStart = this.addDays(this.weekStart, -7);
    this.loadWeek();
  }

  nextWeek(): void {
    this.weekStart = this.addDays(this.weekStart, 7);
    this.loadWeek();
  }

  currentWeek(): void {
    this.weekStart = this.getMonday(new Date());
    this.loadWeek();
  }

  selectSlot(slot: WeekSlot): void {
    if (!this.isBookable(slot)) {
      return;
    }

    this.successMessage = '';
    this.errorMessage = '';
    this.modalError = '';
    this.topicValue = '';
    this.question = '';
    this.selectedSlot = slot;
  }

  closeModal(): void {
    if (this.saving) {
      return;
    }

    this.selectedSlot = null;
    this.modalError = '';
  }

  confirm(): void {
    if (!this.selectedSlot || this.saving) {
      return;
    }

    if (!this.topicValue) {
      this.modalError = 'Выберите тему обращения.';
      return;
    }

    const question = this.question.trim();

    if (!question) {
      this.modalError = 'Опишите ваш вопрос.';
      return;
    }

    const slot = this.selectedSlot;

    this.saving = true;
    this.modalError = '';

    this.api.createAppointment({
      period_id: slot.period_id,
      slot_start: slot.starts_at,
      topic_id: this.topicValue === 'other' ? null : Number(this.topicValue),
      question,
    }).subscribe({
      next: () => {
        this.successMessage =
          `Вы записаны на ${this.formatDate(slot.starts_at)} в ${this.formatTime(slot.starts_at)}. ` +
          `Декан: ${slot.dean_name}. ` +
          `Аудитория: ${slot.room || 'будет сообщена дополнительно'}. ` +
          'Запись доступна в разделе «Мои записи».';

        this.saving = false;
        this.selectedSlot = null;
        this.loadWeek();
      },
      error: (error) => {
        this.modalError = this.readError(
          error,
          'Не удалось записаться. Попробуйте выбрать другое время.',
        );

        this.saving = false;
        this.cdr.detectChanges();
        this.loadWeek();
      },
    });
  }

  formatTime(value: string): string {
    return new Intl.DateTimeFormat('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  }

  formatDate(value: string): string {
    return new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'long',
    }).format(new Date(value));
  }

  trackByDay(_index: number, day: CalendarDay): number {
    return day.date.getTime();
  }

  trackBySlot(_index: number, slot: WeekSlot): string {
    return `${slot.period_id}-${slot.starts_at}`;
  }

  private buildDays(slots: WeekSlot[]): CalendarDay[] {
    const weekdayFormat = new Intl.DateTimeFormat('ru-RU', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
    });

    return Array.from({ length: 7 }, (_, index) => {
      const date = this.addDays(this.weekStart, index);

      return {
        date,
        label: weekdayFormat.format(date),
        slots: slots.filter((slot) =>
          this.isSameDay(new Date(slot.starts_at), date),
        ),
      };
    });
  }

  private readError(error: { error?: { detail?: unknown } }, fallback: string): string {
    const detail = error.error?.detail;

    return typeof detail === 'string' ? detail : fallback;
  }

  private getMonday(value: Date): Date {
    const date = new Date(value.getFullYear(), value.getMonth(), value.getDate());
    const shift = (date.getDay() + 6) % 7;

    date.setDate(date.getDate() - shift);

    return date;
  }

  private addDays(value: Date, days: number): Date {
    const date = new Date(value.getFullYear(), value.getMonth(), value.getDate());

    date.setDate(date.getDate() + days);

    return date;
  }

  private isSameDay(a: Date, b: Date): boolean {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  private toApiDate(value: Date): string {
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');

    return `${value.getFullYear()}-${month}-${day}`;
  }

  private formatShortDate(value: Date): string {
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
    }).format(value);
  }
}
