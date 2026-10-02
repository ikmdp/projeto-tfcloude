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

export const routes: Routes = [
  { path: '', component: Home, pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'cadastro', component: Cadastro },
  { path: 'esqueci-senha', component: EsqueciSenha },
  { path: 'redefinir-senha', component: RedefinirSenha },

  // Telas internas: dividem o menu lateral do Layout
  {
    path: '',
    component: Layout,
    children: [
      { path: 'painel', component: Painel },
      { path: 'enviar', component: EnviarTfc },
      { path: 'acervo', component: Acervo },
    ],
  },
];