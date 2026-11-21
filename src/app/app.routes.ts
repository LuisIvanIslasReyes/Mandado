import { Routes } from '@angular/router';
import { soloFamilia, soloSinAcceso, soloSinSesion } from './core/auth.guards';

export const routes: Routes = [
  {
    path: 'entrar',
    title: 'Entrar · Mandado',
    canActivate: [soloSinSesion],
    loadComponent: () => import('./features/entrar/entrar').then((m) => m.Entrar),
  },
  {
    path: 'sin-acceso',
    title: 'Sin acceso · Mandado',
    canActivate: [soloSinAcceso],
    loadComponent: () => import('./features/sin-acceso/sin-acceso').then((m) => m.SinAcceso),
  },
  {
    path: '',
    title: 'Mandado',
    canActivate: [soloFamilia],
    loadComponent: () => import('./features/inicio/inicio').then((m) => m.Inicio),
  },
  { path: '**', redirectTo: '' },
];
