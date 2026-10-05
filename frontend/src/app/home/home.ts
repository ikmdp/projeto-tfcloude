import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Logo } from '../logo/logo';

@Component({
  selector: 'app-home',
  imports: [Logo],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  private router = inject(Router);

  estatisticas = [
    { valor: '312', legenda: 'Projetos Arquivados', verde: false },
    { valor: '100%', legenda: 'Acesso Digital', verde: false },
    { valor: 'Ativo', legenda: 'Fila de Avaliação', verde: true },
  ];

  comecar() {
    this.router.navigate(['/login']);
  }
}
