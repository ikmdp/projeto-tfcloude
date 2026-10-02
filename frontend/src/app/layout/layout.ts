import { Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Sessao } from '../servicos/sessao';

@Component({
  selector: 'app-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './layout.html',
  styleUrl: './layout.css',
})
export class Layout implements OnInit {
  private router = inject(Router);
  private sessao = inject(Sessao);
  private ehNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  ngOnInit() {
    // Todas as telas internas exigem login
    if (this.ehNavegador && !this.sessao.usuario) {
      this.router.navigate(['/login']);
    }
  }

  sair() {
    this.sessao.sair();
    this.router.navigate(['/login']);
  }
}