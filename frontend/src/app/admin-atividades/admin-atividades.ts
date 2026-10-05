import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Atividade, Atividades } from '../servicos/atividades';
import { formatarDataHora } from '../servicos/formatacao';

const POR_PAGINA = 30;

@Component({
  selector: 'app-admin-atividades',
  imports: [FormsModule],
  templateUrl: './admin-atividades.html',
  styleUrl: './admin-atividades.css',
})
export class AdminAtividades implements OnInit {
  private registro = inject(Atividades);

  todas: Atividade[] = [];
  acoes: string[] = [];
  filtradas: Atividade[] = [];

  acaoAtual = '';
  consulta = '';
  limite = POR_PAGINA;

  ngOnInit() {
    this.todas = this.registro.listar();
    this.acoes = [...new Set(this.todas.map((a) => a.acao))].sort((a, b) =>
      a.localeCompare(b, 'pt-BR'),
    );
    this.filtrar();
  }

  get visiveis(): Atividade[] {
    return this.filtradas.slice(0, this.limite);
  }

  filtrar() {
    const termo = this.normalizar(this.consulta);

    this.filtradas = this.todas.filter((a) => {
      if (this.acaoAtual && a.acao !== this.acaoAtual) return false;
      if (!termo) return true;
      return this.normalizar(`${a.por} ${a.acao} ${a.detalhe}`).includes(termo);
    });
    this.limite = POR_PAGINA;
  }

  mostrarMais() {
    this.limite += POR_PAGINA;
  }

  quando(iso: string): string {
    return formatarDataHora(iso);
  }

  private normalizar(texto: string): string {
    return texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }
}