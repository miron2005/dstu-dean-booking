import { Routes } from '@angular/router';

import { Home } from './pages/home/home';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { StudentDashboard } from './pages/student-dashboard/student-dashboard';
import { NewAppointment } from './pages/new-appointment/new-appointment';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'login', component: Login },
  { path: 'register', component: Register },

  { path: 'student', component: StudentDashboard },
  { path: 'student/new-appointment', component: NewAppointment },

  { path: '**', redirectTo: '' }
];