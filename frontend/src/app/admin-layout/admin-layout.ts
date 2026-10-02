import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Sessao } from '../servicos/sessao';
import { Logo } from '../logo/logo';

@Component({
  selector: 'app-admin-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, Logo],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.css',
})
export class AdminLayout {
  private router = inject(Router);
  private sessao = inject(Sessao);

  sair() {
    this.sessao.sair();
    this.router.navigate(['/login']);
  }
}