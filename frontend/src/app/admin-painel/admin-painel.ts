import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Sessao } from '../servicos/sessao';
import { Envios, StatusEnvio, dataUltimoEnvio } from '../servicos/envios';
import { descreverQuando } from '../servicos/formatacao';

interface Estatistica {
  valor: number;
  legenda: string;
}

interface EnvioRecente {
  id: string;
  titulo: string;
  detalhe: string;
  status: StatusEnvio;
}

@Component({
  selector: 'app-admin-painel',
  imports: [RouterLink],
  templateUrl: './admin-painel.html',
  styleUrl: './admin-painel.css',
})
export class AdminPainel implements OnInit {
  private sessao = inject(Sessao);
  private envios = inject(Envios);

  nome = '';
  saudacao = '';
  aguardando = 0;

  estatisticas: Estatistica[] = [];
  recentes: EnvioRecente[] = [];

  ngOnInit() {
    this.nome = this.sessao.primeiroNome;
    this.saudacao = this.calcularSaudacao();

    const lista = this.envios.listarTodos();
    const total = (status: StatusEnvio) => lista.filter((e) => e.status === status).length;

    this.aguardando = total('Em análise');

    this.estatisticas = [
      { valor: lista.length, legenda: 'trabalhos enviados' },
      { valor: this.aguardando, legenda: 'aguardando avaliação' },
      { valor: total('Ajustes solicitados'), legenda: 'em ajustes' },
      { valor: total('Aprovado'), legenda: 'aprovados' },
      { valor: total('Reprovado'), legenda: 'reprovados' },
    ];

    this.recentes = lista.slice(0, 5).map((e) => ({
      id: e.id,
      titulo: e.titulo,
      detalhe: `${e.autor} · ${e.curso} · ${e.versao > 1 ? 'reenviado' : 'enviado'} ${descreverQuando(dataUltimoEnvio(e))}`,
      status: e.status,
    }));
  }

  private calcularSaudacao(): string {
    const hora = new Date().getHours();
    if (hora < 12) return 'Bom dia';
    if (hora < 18) return 'Boa tarde';
    return 'Boa noite';
  }
}