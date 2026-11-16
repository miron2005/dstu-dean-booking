
import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
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
  private cdr = inject(ChangeDetectorRef);

  faculties: Faculty[] = [];

  fullName = '';
  email = '';
  facultyId: number | null = null;
  password = '';
  confirmPassword = '';

  loading = false;
  loadingFaculties = true;
  submitted = false;

  errorMessage = '';
  emailServerError = '';

  ngOnInit(): void {
    this.api.getFaculties().subscribe({
      next: (faculties) => {
        this.faculties = faculties;
        this.loadingFaculties = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Не удалось загрузить список факультетов.';
        this.loadingFaculties = false;
        this.cdr.detectChanges();
      },
    });
  }

  get isFullNameInvalid(): boolean {
    const words = this.fullName.trim().split(/\s+/);

    if (words.length < 2) {
      return true;
    }

    return !words.every((word) => /^[\p{L}]+(?:-[\p{L}]+)*$/u.test(word));
  }

  get isEmailInvalid(): boolean {
    const value = this.email.trim();

    return (
      value.length > 255 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    );
  }

  get passwordsDoNotMatch(): boolean {
    return (
      this.confirmPassword.length > 0 &&
      this.password !== this.confirmPassword
    );
  }

  onSubmit(): void {
    if (this.loading) {
      return;
    }

    this.submitted = true;
    this.errorMessage = '';
    this.emailServerError = '';

    if (!this.fullName.trim()) {
      return;
    }

    if (this.isFullNameInvalid || this.fullName.trim().length > 200) {
      return;
    }

    if (!this.email.trim() || this.isEmailInvalid) {
      return;
    }

    if (!this.facultyId) {
      return;
    }

    if (this.password.length < 8) {
      return;
    }

    if (this.password !== this.confirmPassword) {
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

        this.password = '';
        this.confirmPassword = '';

        this.cdr.detectChanges();
        this.router.navigate(['/login']);
      },
      error: (error: HttpErrorResponse) => {
        this.loading = false;

        const detail = error.error?.detail;

        if (typeof detail === 'string') {
          if (detail.toLowerCase().includes('почта уже занята')) {
            this.emailServerError = detail;
          } else {
            this.errorMessage = detail;
          }
        } else {
          this.errorMessage =
            'Не удалось зарегистрироваться. Проверьте введённые данные.';
        }

        this.cdr.detectChanges();
      },
    });
  }
}
