
import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import {
  ApiService,
  ReceptionPeriod,
  User,
} from '../../core/api';

@Component({
  selector: 'app-new-appointment',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './new-appointment.html',
  styleUrl: './new-appointment.css',
})
export class NewAppointment implements OnInit {
  private api = inject(ApiService);
  private cdr = inject(ChangeDetectorRef);

  user: User | null = null;

  periods: ReceptionPeriod[] = [];
  topics: any[] = [];

  loading = true;
  savingPeriodId: number | null = null;

  errorMessage = '';
  successMessage = '';

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

        this.loadPeriods(user.faculty_id);
        this.loadTopics(user.faculty_id);
      },
      error: (error) => {
        console.error('Ошибка загрузки профиля:', error);

        this.errorMessage = 'Не удалось загрузить профиль пользователя.';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  // Загрузка окон приёма
  loadPeriods(facultyId: number): void {
    this.loading = true;

    this.api.getPeriods().subscribe({
      next: (periods) => {
        console.log('Полученные окна от сервера:', periods);
        console.log('Факультет студента:', facultyId);

        this.periods = periods
          .filter((period) =>
            Number(period.faculty_id) === Number(facultyId) &&
            period.status === 'open' &&
            Number(period.free_places) > 0
          )
          .sort(
            (a, b) =>
              new Date(a.starts_at).getTime() -
              new Date(b.starts_at).getTime()
          );

        console.log('Окна, доступные студенту:', this.periods);

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Ошибка загрузки окон:', error);

        this.errorMessage = 'Не удалось загрузить окна приёма.';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  // Загрузка тем обращения
  loadTopics(facultyId: number): void {
    this.api.getTopics(facultyId).subscribe({
      next: (response: any) => {
        console.log('Ответ сервера по темам:', response);

        let receivedTopics: any[] = [];

        if (Array.isArray(response)) {
          receivedTopics = response;
        } else if (Array.isArray(response?.items)) {
          receivedTopics = response.items;
        } else if (Array.isArray(response?.topics)) {
          receivedTopics = response.topics;
        }

        this.topics = receivedTopics;

        console.log('Темы, доступные для записи:', this.topics);

        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Ошибка загрузки тем:', error);

        this.topics = [];
        this.cdr.detectChanges();
      },
    });
  }

  // Запись студента на выбранное окно
  bookPeriod(period: ReceptionPeriod): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (this.savingPeriodId !== null) {
      return;
    }

    if (this.topics.length === 0) {
      this.errorMessage =
        'Сервер не вернул ни одной темы обращения. Запись пока недоступна.';

      this.cdr.detectChanges();
      return;
    }

    const selectedTopic = this.topics[0];

    if (selectedTopic.id == null) {
      this.errorMessage =
        'У полученной темы отсутствует идентификатор. Запись невозможна.';

      this.cdr.detectChanges();
      return;
    }

    this.savingPeriodId = period.id;
    this.cdr.detectChanges();

    this.api.createAppointment({
      period_id: period.id,
      topic_id: Number(selectedTopic.id),
      question: '',
    }).subscribe({
      next: (appointment) => {
        this.successMessage =
          `Вы успешно записаны! Ваш номер в очереди: ${appointment.queue_number}.`;

        this.savingPeriodId = null;
        this.cdr.detectChanges();

        if (this.user?.faculty_id != null) {
          this.loadPeriods(this.user.faculty_id);
        }
      },
      error: (error) => {
        console.error('Ошибка записи на приём:', error);

        this.errorMessage =
          error.error?.detail ||
          'Не удалось записаться. Возможно, окно уже занято или запись закрыта.';

        this.savingPeriodId = null;
        this.cdr.detectChanges();

        if (this.user?.faculty_id != null) {
          this.loadPeriods(this.user.faculty_id);
        }
      },
    });
  }
}
