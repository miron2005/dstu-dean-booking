
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { ApiService, Faculty } from '../../core/api';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);

  faculties: Faculty[] = [];

  fullName = '';
  email = '';
  facultyId: number | null = null;
  password = '';
  confirmPassword = '';

  loading = false;
  loadingFaculties = true;
  errorMessage = '';
  successMessage = '';

  ngOnInit(): void {
    this.api.getFaculties().subscribe({
      next: (faculties) => {
        this.faculties = faculties;
        this.loadingFaculties = false;
      },
      error: () => {
        this.errorMessage = 'Не удалось загрузить список факультетов.';
        this.loadingFaculties = false;
      },
    });
  }

  onSubmit(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.facultyId) {
      this.errorMessage = 'Выберите факультет.';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Пароли не совпадают.';
      return;
    }

    if (this.password.length < 8) {
      this.errorMessage = 'Пароль должен содержать минимум 8 символов.';
      return;
    }

    this.loading = true;

    this.api.register({
      full_name: this.fullName.trim(),
      email: this.email.trim(),
      password: this.password,
      faculty_id: this.facultyId,
    }).subscribe({
      next: () => {
        this.loading = false;
        this.successMessage = 'Регистрация прошла успешно! Теперь вы можете войти.';
        this.password = '';
        this.confirmPassword = '';
      },
      error: (error: HttpErrorResponse) => {
        this.loading = false;

        const detail = error.error?.detail;

        this.errorMessage =
          typeof detail === 'string'
            ? detail
            : 'Не удалось зарегистрироваться. Проверьте введённые данные.';
      },
    });
  }
}
