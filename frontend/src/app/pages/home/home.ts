import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ApiService } from '../../core/api';

@Component({
  imports: [RouterLink],
  selector: 'app-home',
  styleUrl: './home.css',
  templateUrl: './home.html',
})
export class Home {
  private readonly api = inject(ApiService);

  get isLoggedIn(): boolean {
    return !!this.api.getToken();
  }
}
