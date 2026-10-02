import { Component, OnInit, inject } from '@angular/core';
import { Envios } from '../servicos/envios';

interface ItemFila {
  id: string;
  titulo: string;
  detalhe: string;
}

interface Aviso {
  id: string;
  texto: string;
}

@Component({
  selector: 'app-avaliacao',
  imports: [],
  templateUrl: './avaliacao.html',
  styleUrl: './avaliacao.css',
})
export class Avaliacao implements OnInit {
  private envios = inject(Envios);

  fila: ItemFila[] = [];
  aviso: Aviso | null = null;

  ngOnInit() {
    this.carregar();
  }

  aprovar(item: ItemFila) {
    this.envios.alterarStatus(item.id, 'Aprovado');
    this.aviso = { id: item.id, texto: `"${item.titulo}" foi aprovado e entrou no acervo.` };
    this.carregar();
  }

  reprovar(item: ItemFila) {
    this.envios.alterarStatus(item.id, 'Reprovado');
    this.aviso = { id: item.id, texto: `"${item.titulo}" foi reprovado.` };
    this.carregar();
  }

  desfazer() {
    if (!this.aviso) return;
    this.envios.alterarStatus(this.aviso.id, 'Em análise');
    this.aviso = null;
    this.carregar();
  }

  fecharAviso() {
    this.aviso = null;
  }

  private carregar() {
    this.fila = this.envios.listarEmAnalise().map((e) => ({
      id: e.id,
      titulo: e.titulo,
      detalhe: `${e.autor} · ${e.curso} · ${this.descreverQuando(e.enviadoEm)}`,
    }));
  }

  private descreverQuando(iso: string): string {
    const minutos = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);

    if (minutos < 1) return 'enviado agora';
    if (minutos < 60) return `enviado há ${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}`;

    const horas = Math.floor(minutos / 60);
    if (horas < 24) return `enviado há ${horas} ${horas === 1 ? 'hora' : 'horas'}`;

    const dias = Math.floor(horas / 24);
    if (dias <= 30) return `enviado há ${dias} ${dias === 1 ? 'dia' : 'dias'}`;

    return `enviado em ${new Date(iso).toLocaleDateString('pt-BR')}`;
  }
}