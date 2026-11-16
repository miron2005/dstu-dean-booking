
import { Routes } from '@angular/router';

import { Home } from './pages/home/home';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';

import { StudentDashboard } from './pages/student-dashboard/student-dashboard';
import { NewAppointment } from './pages/new-appointment/new-appointment';
import { MyAppointments } from './pages/my-appointments/my-appointments';
import { SecretaryDashboard } from './pages/secretary-dashboard/secretary-dashboard';

import { DeanDashboard } from './pages/dean-dashboard/dean-dashboard';
import { AdminDashboard } from './pages/admin-dashboard/admin-dashboard';

export const routes: Routes = [
  { path: '', component: Home },

  { path: 'login', component: Login },
  { path: 'register', component: Register },

  { path: 'student', component: StudentDashboard },
  { path: 'student/my-appointments', component: MyAppointments },
  { path: 'student/new-appointment', component: NewAppointment },

  { path: 'dean', component: DeanDashboard },

  { path: 'admin', component: AdminDashboard },

  { path: 'secretary', component: SecretaryDashboard },
  { path: '**', redirectTo: '' },
];
