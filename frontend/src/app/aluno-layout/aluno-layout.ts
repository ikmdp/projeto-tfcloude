import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Sessao } from '../servicos/sessao';
import { Logo } from '../logo/logo';

@Component({
  selector: 'app-aluno-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, Logo],
  templateUrl: './aluno-layout.html',
  styleUrl: './aluno-layout.css',
})
export class AlunoLayout {
  private router = inject(Router);
  private sessao = inject(Sessao);

  nome = this.sessao.primeiroNome;

  sair() {
    this.sessao.sair();
    this.router.navigate(['/login']);
  }
}