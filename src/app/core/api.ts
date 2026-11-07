
import { Injectable, inject } from '@angular/core';
import {
  HttpClient,
  HttpHeaders,
  HttpParams,
} from '@angular/common/http';
import { Observable, tap } from 'rxjs';

// Факультет
export interface Faculty {
  id: number;
  name: string;
  is_active: boolean;
}

// Пользователь
export interface User {
  id: number;
  full_name: string;
  email: string;
  role: string;
  faculty_id: number | null;
  is_active: boolean;
}

// Данные регистрации
export interface RegisterData {
  full_name: string;
  email: string;
  password: string;
  faculty_id: number;
}

// Ответ авторизации
export interface TokenResponse {
  access_token: string;
  token_type: string;
}

// Приёмный период
export interface ReceptionPeriod {
  id: number;
  faculty_id: number;
  dean_id: number;
  starts_at: string;
  ends_at: string;
  capacity: number;
  free_places: number;
  status: string;
}

// Запись студента в очереди
export interface QueueItem {
  id: number;
  period_id: number;
  topic_id: number;
  question: string;
  queue_number: number;
  status: string;
  created_at: string;
  student_name: string;
  result_comment: string | null;
}

// Результат приёма
export interface AppointmentResult {
  status: 'accepted' | 'no_show';
  result_comment: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private http = inject(HttpClient);

  private readonly apiUrl = 'http://127.0.0.1:8000';
  private readonly tokenKey = 'deanery_access_token';

  // -------------------------
  // ФАКУЛЬТЕТЫ
  // -------------------------

  getFaculties(): Observable<Faculty[]> {
    return this.http.get<Faculty[]>(
      `${this.apiUrl}/faculties`,
    );
  }

  // -------------------------
  // РЕГИСТРАЦИЯ И АВТОРИЗАЦИЯ
  // -------------------------

  register(data: RegisterData): Observable<User> {
    return this.http.post<User>(
      `${this.apiUrl}/auth/register`,
      data,
    );
  }

  login(
    email: string,
    password: string,
  ): Observable<TokenResponse> {
    const body = new HttpParams()
      .set('username', email)
      .set('password', password);

    return this.http.post<TokenResponse>(
      `${this.apiUrl}/auth/login`,
      body.toString(),
      {
        headers: new HttpHeaders({
          'Content-Type': 'application/x-www-form-urlencoded',
        }),
      },
    ).pipe(
      tap((response) => {
        localStorage.setItem(
          this.tokenKey,
          response.access_token,
        );
      }),
    );
  }

  getMe(): Observable<User> {
    return this.http.get<User>(
      `${this.apiUrl}/auth/me`,
      {
        headers: this.getAuthHeaders(),
      },
    );
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  // -------------------------
  // КАБИНЕТ ДЕКАНА
  // -------------------------

  // Получить приёмные периоды
  getPeriods(): Observable<ReceptionPeriod[]> {
    return this.http.get<ReceptionPeriod[]>(
      `${this.apiUrl}/periods`,
      {
        headers: this.getAuthHeaders(),
      },
    );
  }

  // Получить очередь выбранного периода
  getQueue(periodId: number): Observable<QueueItem[]> {
    return this.http.get<QueueItem[]>(
      `${this.apiUrl}/periods/${periodId}/queue`,
      {
        headers: this.getAuthHeaders(),
      },
    );
  }

  // Вызвать следующего студента
  callNext(periodId: number): Observable<QueueItem> {
    return this.http.post<QueueItem>(
      `${this.apiUrl}/periods/${periodId}/call-next`,
      {},
      {
        headers: this.getAuthHeaders(),
      },
    );
  }

  // Зафиксировать результат приёма
  setAppointmentResult(
    appointmentId: number,
    data: AppointmentResult,
  ): Observable<QueueItem> {
    return this.http.patch<QueueItem>(
      `${this.apiUrl}/appointments/${appointmentId}/result`,
      data,
      {
        headers: this.getAuthHeaders(),
      },
    );
  }

  // -------------------------
  // ЗАГОЛОВКИ АВТОРИЗАЦИИ
  // -------------------------

  private getAuthHeaders(): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${this.getToken() ?? ''}`,
    });
  }
}
