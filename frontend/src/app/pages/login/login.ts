
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { ApiService } from '../../core/api';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private api = inject(ApiService);
  private router = inject(Router);

  email = '';
  password = '';

  loading = false;
  errorMessage = '';

  onSubmit(): void {
    this.errorMessage = '';

    const email = this.email.trim();

    if (!email || !this.password) {
      this.errorMessage = 'Введите электронную почту и пароль.';
      return;
    }

    this.loading = true;

    this.api.login(email, this.password).subscribe({
      next: (response) => {
        this.api['getToken'];

        localStorage.setItem('deanery_access_token', response.access_token);

        this.api.getMe().subscribe({
          next: (user) => {
            this.loading = false;

            switch (user.role) {
              case 'student':
                this.router.navigate(['/student']);
                break;

              case 'secretary':
                this.router.navigate(['/secretary']);
                break;

              case 'dean':
                this.router.navigate(['/dean']);
                break;

              case 'admin':
                this.router.navigate(['/admin']);
                break;

              default:
                this.api.logout();
                this.errorMessage = 'Неизвестная роль пользователя.';
            }
          },
          error: () => {
            this.loading = false;
            this.api.logout();
            this.errorMessage =
              'Не удалось получить данные пользователя. Попробуйте войти снова.';
          },
        });
      },
      error: (error: HttpErrorResponse) => {
        this.loading = false;

        const detail = error.error?.detail;

        this.errorMessage =
          typeof detail === 'string'
            ? detail
            : 'Не удалось войти. Проверьте почту и пароль.';
      },
    });
  }
}
