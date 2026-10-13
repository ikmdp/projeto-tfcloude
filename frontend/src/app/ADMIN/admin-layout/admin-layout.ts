import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { Sessao } from '../../servicos/sessao';
import { Envios } from '../../servicos/envios';
import { Logo } from '../../logo/logo';

@Component({
  selector: 'app-admin-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, Logo],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.css',
})
export class AdminLayout {
  private router = inject(Router);
  private sessao = inject(Sessao);
  private envios = inject(Envios);

  naFila = 0;

  constructor() {
    this.atualizarFila();

    // A cada troca de tela, confere de novo quantos trabalhos aguardam avaliação
    this.router.events
      .pipe(
        filter((evento) => evento instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.atualizarFila());
  }

  /** Encerra a sessão e volta para a tela inicial. */
  sair() {
    this.sessao.sair();
    this.router.navigate(['/']);
  }


  private atualizarFila() {
    this.naFila = this.envios.listarEmAnalise().length;
  }
}