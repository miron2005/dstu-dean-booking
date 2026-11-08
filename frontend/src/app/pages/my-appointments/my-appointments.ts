
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-my-appointments',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './my-appointments.html',
  styleUrl: './my-appointments.css',
})
export class MyAppointments {
}

