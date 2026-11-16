
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

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

export interface User {
  id: number;
  full_name: string;
  email: string;
  role: string;
  faculty_id: number | null;
  group_name?: string | null;
  faculty_name?: string | null;
  dean_name?: string | null;
  is_active: boolean;
}

export interface ProfileUpdate {
  full_name?: string;
  group_name?: string;
}

export interface Dean {
  id: number;
  full_name: string;
}

export interface RegisterData {
  full_name: string;
  email: string;
  password: string;
  faculty_id?: number | null;
  group_name: string;
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

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface ReceptionPeriod {
  id: number;
  faculty_id: number;
  dean_id: number;
  dean_name?: string;
  room?: string | null;
  starts_at: string;
  ends_at: string;
  capacity: number;
  slot_minutes: number;
  free_places: number;
  booked_places: number;
  past_places: number;
  status: string;
}

export type PeriodScope = 'upcoming' | 'past' | 'all';

export interface PeriodCreate {
  starts_at: string;
  ends_at: string;
  slot_minutes: number;
  room: string;
}

export interface PeriodUpdate {
  starts_at?: string;
  ends_at?: string;
  slot_minutes?: number;
  room?: string;
}

export interface Slot {
  starts_at: string;
  ends_at: string;
  is_free: boolean;
  is_past: boolean;
}

export interface WeekSlot extends Slot {
  period_id: number;
  dean_name: string;
  room: string | null;
}

export interface AppealTopic {
  id: number;
  faculty_id: number;
  title: string;
  description: string | null;
  is_active: boolean;
}

export interface AppealTopicCreate {
  title: string;
  description?: string | null;
}

export interface AppealTopicUpdate {
  title?: string;
  description?: string | null;
  is_active?: boolean;
}

export interface AppointmentCreate {
  period_id: number;
  slot_start: string;
  topic_id: number | null;
  question: string;
}

export interface QueueItem {
  id: number;
  period_id: number;
  topic_id: number | null;
  question: string;
  queue_number: number;
  slot_start: string | null;
  dean_name: string;
  room: string | null;
  status: string;
  created_at: string;
  student_name: string;
  result_comment: string | null;
}

export interface AppointmentResult {
  status: string;
  result_comment?: string | null;
}

export interface StudentAppointment {
  id: number;
  period_id: number;
  topic_id: number | null;
  question: string;
  queue_number: number;
  slot_start: string | null;
  dean_name: string;
  room: string | null;
  status: string;
  created_at: string;
}

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

  private getAuthHeaders(): HttpHeaders {
    const token = this.getToken();

    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
  }

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

  updateMe(data: ProfileUpdate): Observable<User> {
    return this.http.patch<User>(
      `${this.baseUrl}/auth/me`,
      data,
      { headers: this.getAuthHeaders() },
    );
  }

  getToken(): string | null {
    return localStorage.getItem('deanery_access_token');
  }

  logout(): void {
    localStorage.removeItem('deanery_access_token');
  }

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

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(
      `${this.baseUrl}/users`,
      { headers: this.getAuthHeaders() },
    );
  }

  deleteUser(userId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/users/${userId}`,
      { headers: this.getAuthHeaders() },
    );
  }

  getDeans(): Observable<Dean[]> {
    return this.http.get<Dean[]>(
      `${this.baseUrl}/deans`,
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

  getPeriods(scope: PeriodScope = 'upcoming'): Observable<ReceptionPeriod[]> {
    return this.http.get<ReceptionPeriod[]>(
      `${this.baseUrl}/periods`,
      {
        headers: this.getAuthHeaders(),
        params: { scope },
      },
    );
  }

  getPeriodSlots(periodId: number): Observable<Slot[]> {
    return this.http.get<Slot[]>(
      `${this.baseUrl}/periods/${periodId}/slots`,
      { headers: this.getAuthHeaders() },
    );
  }

  getSlots(dateFrom: string, dateTo: string): Observable<WeekSlot[]> {
    return this.http.get<WeekSlot[]>(
      `${this.baseUrl}/slots`,
      {
        headers: this.getAuthHeaders(),
        params: { date_from: dateFrom, date_to: dateTo },
      },
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

  getTopics(facultyId: number): Observable<AppealTopic[]> {
    return this.http.get<AppealTopic[]>(
      `${this.baseUrl}/topics`,
      {
        headers: this.getAuthHeaders(),
        params: { faculty_id: facultyId },
      },
    );
  }

  getManagedTopics(): Observable<AppealTopic[]> {
    return this.http.get<AppealTopic[]>(
      `${this.baseUrl}/topics/manage`,
      { headers: this.getAuthHeaders() },
    );
  }

  createTopic(data: AppealTopicCreate): Observable<AppealTopic> {
    return this.http.post<AppealTopic>(
      `${this.baseUrl}/topics`,
      data,
      { headers: this.getAuthHeaders() },
    );
  }

  updateTopic(
    topicId: number,
    data: AppealTopicUpdate,
  ): Observable<AppealTopic> {
    return this.http.patch<AppealTopic>(
      `${this.baseUrl}/topics/${topicId}`,
      data,
      { headers: this.getAuthHeaders() },
    );
  }

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

  createAppointment(
    data: AppointmentCreate,
  ): Observable<StudentAppointment> {
    return this.http.post<StudentAppointment>(
      `${this.baseUrl}/appointments`,
      data,
      { headers: this.getAuthHeaders() },
    );
  }

  cancelAppointment(appointmentId: number): Observable<StudentAppointment> {
    return this.http.post<StudentAppointment>(
      `${this.baseUrl}/appointments/${appointmentId}/cancel`,
      {},
      { headers: this.getAuthHeaders() },
    );
  }

  getMyAppointments(): Observable<StudentAppointment[]> {
    return this.http.get<StudentAppointment[]>(
      `${this.baseUrl}/appointments/my`,
      { headers: this.getAuthHeaders() },
    );
  }

  getNotifications(): Observable<StudentNotification[]> {
    return this.http.get<StudentNotification[]>(
      `${this.baseUrl}/notifications`,
      { headers: this.getAuthHeaders() },
    );
  }
}
