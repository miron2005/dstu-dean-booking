
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface Faculty {
  id: number;
  name: string;
  is_active: boolean;
}

export interface User {
  id: number;
  full_name: string;
  email: string;
  role: string;
  faculty_id: number | null;
  is_active: boolean;
}

export interface UserCreate {
  full_name: string;
  email: string;
  password: string;
  role: 'student' | 'secretary' | 'dean' | 'admin';
  faculty_id: number | null;
}

export interface UserUpdate {
  full_name?: string;
  role?: 'student' | 'secretary' | 'dean' | 'admin';
  faculty_id?: number | null;
  is_active?: boolean;
}

export interface FacultyCreate {
  name: string;
}

export interface FacultyUpdate {
  name?: string;
  is_active?: boolean;
}

export interface RegisterData {
  full_name: string;
  email: string;
  password: string;
  faculty_id: number;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

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
  dean_id?: number;
  starts_at?: string;
  ends_at?: string;
  capacity?: number;
}

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
  status: 'accepted' | 'no_show';
  result_comment: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly baseUrl = 'http://127.0.0.1:8000';
  private readonly http = inject(HttpClient);
  private readonly tokenKey = 'deanery_access_token';

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

  logout(): void {
    localStorage.removeItem(this.tokenKey);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
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
    id: number,
    data: FacultyUpdate,
  ): Observable<Faculty> {
    return this.http.patch<Faculty>(
      `${this.baseUrl}/faculties/${id}`,
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

  updateUser(
    id: number,
    data: UserUpdate,
  ): Observable<User> {
    return this.http.patch<User>(
      `${this.baseUrl}/users/${id}`,
      data,
      { headers: this.getAuthHeaders() },
    );
  }

  // Приёмные периоды

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
    id: number,
    data: PeriodUpdate,
  ): Observable<ReceptionPeriod> {
    return this.http.patch<ReceptionPeriod>(
      `${this.baseUrl}/periods/${id}`,
      data,
      { headers: this.getAuthHeaders() },
    );
  }

  cancelPeriod(id: number): Observable<ReceptionPeriod> {
    return this.http.post<ReceptionPeriod>(
      `${this.baseUrl}/periods/${id}/cancel`,
      {},
      { headers: this.getAuthHeaders() },
    );
  }

  // Очередь студентов — для декана

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

  // Заголовки авторизации

  private getAuthHeaders(): HttpHeaders {
    const token = this.getToken();

    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
  }
}
