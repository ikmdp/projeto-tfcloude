import { Routes } from '@angular/router';
import { Home } from './home/home';
import { Login } from './login/login';
import { Cadastro } from './cadastro/cadastro';
import { EsqueciSenha } from './esqueci-senha/esqueci-senha';
import { RedefinirSenha } from './redefinir-senha/redefinir-senha';
import { Layout } from './layout/layout';
import { Painel } from './painel/painel';
import { EnviarTfc } from './enviar-tfc/enviar-tfc';
import { Acervo } from './acervo/acervo';
import { Avaliacao } from './avaliacao/avaliacao';
import { AdminLayout } from './admin-layout/admin-layout';
import { AdminPainel } from './admin-painel/admin-painel';
import { alunoGuard, adminGuard } from './servicos/guardas';

export const routes: Routes = [
  { path: '', component: Home, pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'cadastro', component: Cadastro },
  { path: 'esqueci-senha', component: EsqueciSenha },
  { path: 'redefinir-senha', component: RedefinirSenha },

  // Área do aluno
  {
    path: '',
    component: Layout,
    canActivate: [alunoGuard],
    children: [
      { path: 'painel', component: Painel },
      { path: 'enviar', component: EnviarTfc },
      { path: 'acervo', component: Acervo },
    ],
  },

  // Área da coordenação (admin)
  {
    path: 'admin',
    component: AdminLayout,
    canActivate: [adminGuard],
    children: [
      { path: '', component: AdminPainel, pathMatch: 'full' },
      { path: 'avaliacao', component: Avaliacao },
      { path: 'acervo', component: Acervo },
    ],
  },
];