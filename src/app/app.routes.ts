
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

  // Авторизация
  { path: 'login', component: Login },
  { path: 'register', component: Register },

  // Кабинет студента
  { path: 'student', component: StudentDashboard },
  { path: 'student/my-appointments', component: MyAppointments },
  { path: 'student/new-appointment', component: NewAppointment },

  // Кабинет декана
  { path: 'dean', component: DeanDashboard },

  // Кабинет администратора
  { path: 'admin', component: AdminDashboard },

  // Кабинет секретаря
  { path: 'secretary', component: SecretaryDashboard },
  // Неизвестные адреса
  { path: '**', redirectTo: '' },
];
