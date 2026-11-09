
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

// Факультеты

export interface Faculty {
  id: number;
  name: string;
  is_active: boolean;
}

export interface FacultyCreate {
  name: string;
}

export interface FacultyUpdate {
  name?: string;
  is_active?: boolean;
}

// Пользователи

export interface User {
  id: number;
  full_name: string;
  email: string;
  role: string;
  faculty_id: number | null;
  is_active: boolean;
}

export interface RegisterData {
  full_name: string;
  email: string;
  password: string;
  faculty_id?: number | null;
}

export interface UserCreate {
  full_name: string;
  email: string;
  password: string;
  role: string;
  faculty_id?: number | null;
}

export interface UserUpdate {
  full_name?: string;
  email?: string;
  password?: string;
  role?: string;
  faculty_id?: number | null;
  is_active?: boolean;
}

// Авторизация

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

// Периоды приёма

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

export interface PeriodCreate {
  dean_id: number;
  starts_at: string;
  ends_at: string;
  capacity: number;
}

export interface PeriodUpdate {
  starts_at?: string;
  ends_at?: string;
  capacity?: number;
  status?: string;
}

// Темы обращений

export interface AppealTopic {
  id: number;
  faculty_id: number;
  title: string;
  description: string | null;
  is_active: boolean;
}

// Создание записи студента

export interface AppointmentCreate {
  period_id: number;
  topic_id: number;
  question: string;
}

// Очередь

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

export interface AppointmentResult {
  status: string;
  result_comment?: string | null;
}

// Личные записи студента

export interface StudentAppointment {
  id: number;
  period_id: number;
  topic_id: number;
  question: string;
  queue_number: number;
  status: string;
  created_at: string;
}

// Уведомления

export interface StudentNotification {
  id: number;
  appointment_id: number | null;
  kind: string;
  message: string;
  created_at: string;
  read_at: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://127.0.0.1:8000';

  // Заголовки авторизации

  private getAuthHeaders(): HttpHeaders {
    const token = this.getToken();

    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
  }

  // Авторизация

  register(data: RegisterData): Observable<User> {
    return this.http.post<User>(
      `${this.baseUrl}/auth/register`,
      data,
    );
  }

  login(email: string, password: string): Observable<TokenResponse> {
    const body = new URLSearchParams();

    body.set('username', email);
    body.set('password', password);

    return this.http.post<TokenResponse>(
      `${this.baseUrl}/auth/login`,
      body.toString(),
      {
        headers: new HttpHeaders({
          'Content-Type': 'application/x-www-form-urlencoded',
        }),
      },
    );
  }

  getMe(): Observable<User> {
    return this.http.get<User>(
      `${this.baseUrl}/auth/me`,
      { headers: this.getAuthHeaders() },
    );
  }

  getToken(): string | null {
    return localStorage.getItem('deanery_access_token');
  }

  logout(): void {
    localStorage.removeItem('deanery_access_token');
  }

  // Факультеты

  getFaculties(): Observable<Faculty[]> {
    return this.http.get<Faculty[]>(
      `${this.baseUrl}/faculties`,
    );
  }

  createFaculty(data: FacultyCreate): Observable<Faculty> {
    return this.http.post<Faculty>(
      `${this.baseUrl}/faculties`,
      data,
      { headers: this.getAuthHeaders() },
    );
  }

  updateFaculty(
    facultyId: number,
    data: FacultyUpdate,
  ): Observable<Faculty> {
    return this.http.patch<Faculty>(
      `${this.baseUrl}/faculties/${facultyId}`,
      data,
      { headers: this.getAuthHeaders() },
    );
  }

  // Пользователи

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(
      `${this.baseUrl}/users`,
      { headers: this.getAuthHeaders() },
    );
  }

  createUser(data: UserCreate): Observable<User> {
    return this.http.post<User>(
      `${this.baseUrl}/users`,
      data,
      { headers: this.getAuthHeaders() },
    );
  }

  updateUser(userId: number, data: UserUpdate): Observable<User> {
    return this.http.patch<User>(
      `${this.baseUrl}/users/${userId}`,
      data,
      { headers: this.getAuthHeaders() },
    );
  }

  // Периоды приёма

  getPeriods(): Observable<ReceptionPeriod[]> {
    return this.http.get<ReceptionPeriod[]>(
      `${this.baseUrl}/periods`,
      { headers: this.getAuthHeaders() },
    );
  }

  createPeriod(data: PeriodCreate): Observable<ReceptionPeriod> {
    return this.http.post<ReceptionPeriod>(
      `${this.baseUrl}/periods`,
      data,
      { headers: this.getAuthHeaders() },
    );
  }

  updatePeriod(
    periodId: number,
    data: PeriodUpdate,
  ): Observable<ReceptionPeriod> {
    return this.http.patch<ReceptionPeriod>(
      `${this.baseUrl}/periods/${periodId}`,
      data,
      { headers: this.getAuthHeaders() },
    );
  }

  cancelPeriod(periodId: number): Observable<ReceptionPeriod> {
    return this.http.post<ReceptionPeriod>(
      `${this.baseUrl}/periods/${periodId}/cancel`,
      {},
      { headers: this.getAuthHeaders() },
    );
  }

  // Темы обращений

  getTopics(facultyId: number): Observable<AppealTopic[]> {
    return this.http.get<AppealTopic[]>(
      `${this.baseUrl}/topics`,
      {
        headers: this.getAuthHeaders(),
        params: { faculty_id: facultyId },
      },
    );
  }

  // Очередь

  getQueue(periodId: number): Observable<QueueItem[]> {
    return this.http.get<QueueItem[]>(
      `${this.baseUrl}/periods/${periodId}/queue`,
      { headers: this.getAuthHeaders() },
    );
  }

  callNext(periodId: number): Observable<QueueItem> {
    return this.http.post<QueueItem>(
      `${this.baseUrl}/periods/${periodId}/call-next`,
      {},
      { headers: this.getAuthHeaders() },
    );
  }

  setAppointmentResult(
    appointmentId: number,
    data: AppointmentResult,
  ): Observable<QueueItem> {
    return this.http.patch<QueueItem>(
      `${this.baseUrl}/appointments/${appointmentId}/result`,
      data,
      { headers: this.getAuthHeaders() },
    );
  }

  // Создание записи на приём

  createAppointment(
    data: AppointmentCreate,
  ): Observable<StudentAppointment> {
    return this.http.post<StudentAppointment>(
      `${this.baseUrl}/appointments`,
      data,
      { headers: this.getAuthHeaders() },
    );
  }

  // Личные записи студента

  getMyAppointments(): Observable<StudentAppointment[]> {
    return this.http.get<StudentAppointment[]>(
      `${this.baseUrl}/appointments/my`,
      { headers: this.getAuthHeaders() },
    );
  }

  // Уведомления студента

  getNotifications(): Observable<StudentNotification[]> {
    return this.http.get<StudentNotification[]>(
      `${this.baseUrl}/notifications`,
      { headers: this.getAuthHeaders() },
    );
  }
}
