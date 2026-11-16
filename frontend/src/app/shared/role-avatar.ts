import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-role-avatar',
  standalone: true,
  template: `
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.7"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      @switch (role) {
        @case ('student') {
          <path d="M12 4 2 9l10 5 10-5-10-5z" />
          <path d="M6 11.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.5" />
          <path d="M22 9v6" />
        }
        @case ('dean') {
          <path d="M12 3 3 8h18L12 3z" />
          <path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8" />
          <path d="M3 21h18" />
        }
        @case ('secretary') {
          <path d="M8 4h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
          <path d="M9.5 2.5h5v3h-5z" />
          <path d="M9 11h6M9 15h6" />
        }
        @default {
          <path d="M12 3 4 6v6c0 4.5 3.2 7.8 8 9 4.8-1.2 8-4.5 8-9V6l-8-3z" />
          <path d="m9 12 2 2 4-4" />
        }
      }
    </svg>
  `,
  styles: [`
    :host {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
    }

    svg {
      width: 56%;
      height: 56%;
    }
  `],
})
export class RoleAvatar {
  @Input() role: string = 'student';
}
