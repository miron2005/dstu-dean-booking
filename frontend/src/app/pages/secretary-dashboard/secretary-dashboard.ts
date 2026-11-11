
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService, ReceptionPeriod, User, Dean } from '../../core/api';

@Component({
  selector: 'app-secretary-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './secretary-dashboard.html',
  styleUrl: './secretary-dashboard.css',
})
export class SecretaryDashboard implements OnInit {
  user: User | null = null;
  periods: ReceptionPeriod[] = [];
  deans: Dean[] = [];

  loading = false;
  loadingDeans = false;
  saving = false;

  errorMessage = '';
  successMessage = '';
  deansErrorMessage = '';

  editingId: number | null = null;

  form = {
    dean_id: 0,
    starts_at: '',
    ends_at: '',
    capacity: 10,
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

        // Загружаем список деканов и периоды приёма
        this.loadDeans();
        this.loadPeriods();
      },
      error: () => {
        this.api.logout();
        this.router.navigate(['/login']);
      },
    });
  }

  get activePeriodsCount(): number {
    return this.periods.filter(
      (period) => period.status === 'open',
    ).length;
  }

  get cancelledPeriodsCount(): number {
    return this.periods.filter(
      (period) => period.status === 'cancelled',
    ).length;
  }

  get freePlacesCount(): number {
    return this.periods.reduce(
      (sum, period) => sum + Number(period.free_places || 0),
      0,
    );
  }

  // Загрузка списка деканов факультета
  loadDeans(): void {
    this.loadingDeans = true;
    this.deansErrorMessage = '';
    this.cdr.detectChanges();

    this.api.getDeans().subscribe({
      next: (deans) => {
        this.deans = deans;
        this.loadingDeans = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.deansErrorMessage =
          error.error?.detail || 'Не удалось загрузить список деканов';

        this.loadingDeans = false;
        this.cdr.detectChanges();
      },
    });
  }

  // Получение ФИО декана для карточки периода
  getDeanName(period: ReceptionPeriod): string {
    if (period.dean_name) {
      return period.dean_name;
    }

    const dean = this.deans.find(
      (item) => item.id === period.dean_id,
    );

    return dean?.full_name || 'Неизвестный декан';
  }

  // Загрузка периодов
  loadPeriods(): void {
    this.loading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.api.getPeriods().subscribe({
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

  // Создание или редактирование периода
  submitForm(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (
      !this.form.dean_id ||
      !this.form.starts_at ||
      !this.form.ends_at ||
      !Number.isInteger(Number(this.form.capacity)) ||
      Number(this.form.capacity) < 1
    ) {
      this.errorMessage = 'Заполните все поля корректно';
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

    const data = {
      dean_id: Number(this.form.dean_id),
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      capacity: Number(this.form.capacity),
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
          error.error?.detail || 'Не удалось сохранить период приёма';

        this.saving = false;
        this.cdr.detectChanges();
      },
    });
  }

  // Заполнение формы данными выбранного периода
  editPeriod(period: ReceptionPeriod): void {
    this.editingId = period.id;

    // Если декана уже нет среди активных, но его ФИО
    // присутствует в периоде, добавляем его для отображения
    const existingDean = this.deans.find(
      (dean) => dean.id === period.dean_id,
    );

    if (!existingDean && period.dean_name) {
      this.deans = [
        ...this.deans,
        {
          id: period.dean_id,
          full_name: period.dean_name,
        },
      ];
    }

    this.form = {
      dean_id: period.dean_id,
      starts_at: this.toLocalDateTime(period.starts_at),
      ends_at: this.toLocalDateTime(period.ends_at),
      capacity: period.capacity,
    };

    this.successMessage = '';
    this.errorMessage = '';

    this.cdr.detectChanges();

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  // Отмена периода
  cancelPeriod(period: ReceptionPeriod): void {
    const confirmed = window.confirm(
      'Вы действительно хотите отменить этот период приёма?',
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

  // Сброс формы
  resetForm(): void {
    this.editingId = null;

    this.form = {
      dean_id: 0,
      starts_at: '',
      ends_at: '',
      capacity: 10,
    };
  }

  // Выход из системы
  logout(): void {
    this.api.logout();
    this.router.navigate(['/login']);
  }

  // Название статуса
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

  // CSS-класс статуса
  getStatusClass(status: string): string {
    return status === 'open' ? 'active' : status;
  }

  // Преобразование даты для input datetime-local
  private toLocalDateTime(value: string): string {
    const date = new Date(value);
    const offset = date.getTimezoneOffset();

    return new Date(date.getTime() - offset * 60000)
      .toISOString()
      .slice(0, 16);
  }
}
