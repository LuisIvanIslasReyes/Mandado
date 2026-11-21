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
    // Todo lo de aquí abajo requiere sesión y ser de la familia.
    path: '',
    canActivate: [soloFamilia],
    loadComponent: () => import('./features/shell/shell').then((m) => m.Shell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'inventario' },
      {
        path: 'inventario',
        title: 'Inventario · Mandado',
        loadComponent: () => import('./features/inventario/inventario').then((m) => m.Inventario),
      },
      {
        path: 'lista',
        title: 'Lista del súper · Mandado',
        loadComponent: () => import('./features/lista/lista').then((m) => m.Lista),
      },
      {
        path: 'por-caducar',
        title: 'Por caducar · Mandado',
        loadComponent: () => import('./features/por-caducar/por-caducar').then((m) => m.PorCaducar),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
