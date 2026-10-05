import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-logo',
  imports: [],
  templateUrl: './logo.html',
  styleUrl: './logo.css',
})
export class Logo {
  /** Tamanho do ícone, em pixels. */
  @Input() tamanho = 48;

  /** Mostra o nome "tfcloud" e "Escola Técnica" ao lado do ícone. */
  @Input() nome = true;

  /** Coloca o nome embaixo do ícone, em vez de ao lado. */
  @Input() empilhado = false;

  get fonteNome(): number {
    return Math.round(this.tamanho * 0.33);
  }

  get fonteSubtitulo(): number {
    return Math.max(11, Math.round(this.tamanho * 0.15));
  }
}