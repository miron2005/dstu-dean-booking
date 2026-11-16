import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  ApiService,
  AppealTopic,
  PeriodScope,
  ReceptionPeriod,
  User,
} from '../../core/api';
import { RoleAvatar } from '../../shared/role-avatar';

@Component({
  selector: 'app-secretary-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RoleAvatar],
  templateUrl: './secretary-dashboard.html',
  styleUrl: './secretary-dashboard.css',
})
export class SecretaryDashboard implements OnInit {
  user: User | null = null;
  periods: ReceptionPeriod[] = [];
  topics: AppealTopic[] = [];

  readonly minSlotMinutes = 5;
  readonly maxSlotMinutes = 120;

  scope: PeriodScope = 'upcoming';

  loading = false;
  loadingTopics = false;
  saving = false;
  savingTopic = false;

  errorMessage = '';
  successMessage = '';
  topicError = '';
  topicSuccess = '';

  editingId: number | null = null;
  editingTopicId: number | null = null;

  form = {
    starts_at: '',
    ends_at: '',
    slot_minutes: 15 as number | null,
    room: '',
  };

  topicForm = {
    title: '',
    description: '',
  };

  constructor(
    private api: ApiService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    if (!this.api.getToken()) {
      this.router.navigate(['/login']);
      return;
    }

    this.api.getMe().subscribe({
      next: (user) => {
        if (user.role !== 'secretary') {
          this.router.navigate(['/']);
          return;
        }

        this.user = user;
        this.cdr.detectChanges();

        this.loadPeriods();
        this.loadTopics();
      },
      error: () => {
        this.api.logout();
        this.router.navigate(['/login']);
      },
    });
  }

  get isUpcoming(): boolean {
    return this.scope === 'upcoming';
  }

  get activePeriodsCount(): number {
    return this.periods.filter((period) => period.status === 'open').length;
  }

  get cancelledPeriodsCount(): number {
    return this.periods.filter(
      (period) => period.status === 'cancelled',
    ).length;
  }

  get freePlacesCount(): number {
    return this.periods
      .filter((period) => period.status === 'open')
      .reduce((sum, period) => sum + Number(period.free_places || 0), 0);
  }

  get slotMinutes(): number {
    return Number(this.form.slot_minutes);
  }

  get isSlotMinutesValid(): boolean {
    return (
      Number.isInteger(this.slotMinutes) &&
      this.slotMinutes >= this.minSlotMinutes &&
      this.slotMinutes <= this.maxSlotMinutes
    );
  }

  get totalMinutes(): number {
    const start = new Date(this.form.starts_at).getTime();
    const end = new Date(this.form.ends_at).getTime();

    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
      return 0;
    }

    return Math.floor((end - start) / 60000);
  }

  get slotsPreview(): number {
    if (!this.isSlotMinutesValid) {
      return 0;
    }

    return Math.floor(this.totalMinutes / this.slotMinutes);
  }

  get leftoverMinutes(): number {
    return this.isSlotMinutesValid
      ? this.totalMinutes - this.slotsPreview * this.slotMinutes
      : 0;
  }

  setScope(scope: PeriodScope): void {
    if (this.scope === scope) {
      return;
    }

    this.scope = scope;
    this.loadPeriods();
  }

  loadPeriods(): void {
    this.loading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.api.getPeriods(this.scope).subscribe({
      next: (periods) => {
        this.periods = periods;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.errorMessage =
          error.error?.detail || 'Не удалось загрузить периоды приёма';

        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  submitForm(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.form.starts_at || !this.form.ends_at) {
      this.errorMessage = 'Укажите начало и окончание приёма';
      return;
    }

    if (!this.form.room.trim()) {
      this.errorMessage = 'Укажите аудиторию, в которой пройдёт приём';
      return;
    }

    if (!this.isSlotMinutesValid) {
      this.errorMessage =
        `Длительность одного приёма: целое число минут от ${this.minSlotMinutes} до ${this.maxSlotMinutes}`;
      return;
    }

    const startsAt = new Date(this.form.starts_at);
    const endsAt = new Date(this.form.ends_at);

    if (
      Number.isNaN(startsAt.getTime()) ||
      Number.isNaN(endsAt.getTime())
    ) {
      this.errorMessage = 'Указана некорректная дата';
      return;
    }

    if (endsAt <= startsAt) {
      this.errorMessage = 'Время окончания должно быть позже начала';
      return;
    }

    if (this.slotsPreview < 1) {
      this.errorMessage = 'В этом интервале не помещается ни одного окна';
      return;
    }

    const data = {
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      slot_minutes: this.slotMinutes,
      room: this.form.room.trim(),
    };

    this.saving = true;
    this.cdr.detectChanges();

    const isEditing = this.editingId !== null;

    const request = isEditing
      ? this.api.updatePeriod(this.editingId!, data)
      : this.api.createPeriod(data);

    request.subscribe({
      next: () => {
        this.successMessage = isEditing
          ? 'Период приёма обновлён'
          : 'Период приёма создан';

        this.resetForm();
        this.saving = false;

        this.loadPeriods();
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.errorMessage =
          typeof error.error?.detail === 'string'
            ? error.error.detail
            : 'Не удалось сохранить период приёма';

        this.saving = false;
        this.cdr.detectChanges();
      },
    });
  }

  editPeriod(period: ReceptionPeriod): void {
    this.editingId = period.id;

    this.form = {
      starts_at: this.toLocalDateTime(period.starts_at),
      ends_at: this.toLocalDateTime(period.ends_at),
      slot_minutes: period.slot_minutes,
      room: period.room ?? '',
    };

    this.successMessage = '';
    this.errorMessage = '';

    this.cdr.detectChanges();

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  cancelPeriod(period: ReceptionPeriod): void {
    const confirmed = window.confirm(
      'Вы действительно хотите отменить этот период приёма? Записи студентов будут отменены.',
    );

    if (!confirmed) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';

    this.api.cancelPeriod(period.id).subscribe({
      next: () => {
        this.successMessage = 'Период приёма отменён';
        this.loadPeriods();
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.errorMessage =
          error.error?.detail || 'Не удалось отменить период';

        this.cdr.detectChanges();
      },
    });
  }

  resetForm(): void {
    this.editingId = null;

    this.form = {
      starts_at: '',
      ends_at: '',
      slot_minutes: 15,
      room: '',
    };
  }

  loadTopics(): void {
    this.loadingTopics = true;
    this.cdr.detectChanges();

    this.api.getManagedTopics().subscribe({
      next: (topics) => {
        this.topics = topics;
        this.loadingTopics = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.topicError =
          error.error?.detail || 'Не удалось загрузить темы обращений';

        this.loadingTopics = false;
        this.cdr.detectChanges();
      },
    });
  }

  saveTopic(): void {
    this.topicError = '';
    this.topicSuccess = '';

    const title = this.topicForm.title.trim();

    if (!title) {
      this.topicError = 'Укажите название темы';
      return;
    }

    const data = {
      title,
      description: this.topicForm.description.trim() || null,
    };

    this.savingTopic = true;

    const isEditing = this.editingTopicId !== null;

    const request = isEditing
      ? this.api.updateTopic(this.editingTopicId!, data)
      : this.api.createTopic(data);

    request.subscribe({
      next: () => {
        this.topicSuccess = isEditing ? 'Тема обновлена' : 'Тема добавлена';
        this.resetTopicForm();
        this.savingTopic = false;
        this.loadTopics();
      },
      error: (error) => {
        this.topicError =
          typeof error.error?.detail === 'string'
            ? error.error.detail
            : 'Не удалось сохранить тему';

        this.savingTopic = false;
        this.cdr.detectChanges();
      },
    });
  }

  editTopic(topic: AppealTopic): void {
    this.editingTopicId = topic.id;
    this.topicForm = {
      title: topic.title,
      description: topic.description ?? '',
    };
    this.topicError = '';
    this.topicSuccess = '';
  }

  toggleTopic(topic: AppealTopic): void {
    this.topicError = '';
    this.topicSuccess = '';

    this.api.updateTopic(topic.id, { is_active: !topic.is_active }).subscribe({
      next: () => {
        this.topicSuccess = topic.is_active
          ? 'Тема отключена'
          : 'Тема снова доступна студентам';
        this.loadTopics();
      },
      error: (error) => {
        this.topicError =
          error.error?.detail || 'Не удалось изменить тему';

        this.cdr.detectChanges();
      },
    });
  }

  resetTopicForm(): void {
    this.editingTopicId = null;
    this.topicForm = { title: '', description: '' };
  }

  logout(): void {
    this.api.logout();
    this.router.navigate(['/login']);
  }

  getStatusLabel(status: string): string {
    const statuses: Record<string, string> = {
      open: 'Активен',
      active: 'Активен',
      cancelled: 'Отменён',
      completed: 'Завершён',
      closed: 'Закрыт',
    };

    return statuses[status] || status;
  }

  getStatusClass(status: string): string {
    return status === 'open' ? 'active' : status;
  }

  private toLocalDateTime(value: string): string {
    const date = new Date(value);
    const offset = date.getTimezoneOffset();

    return new Date(date.getTime() - offset * 60000)
      .toISOString()
      .slice(0, 16);
  }
}
