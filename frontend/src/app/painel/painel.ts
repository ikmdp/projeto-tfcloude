import { Component, OnInit, inject } from '@angular/core';
import { Sessao } from '../servicos/sessao';
import { Envio, Envios, StatusEnvio } from '../servicos/envios';

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
  selector: 'app-painel',
  imports: [],
  templateUrl: './painel.html',
  styleUrl: './painel.css',
})
export class Painel implements OnInit {
  private sessao = inject(Sessao);
  private envios = inject(Envios);

  nome = '';
  saudacao = '';
  email = '';

  estatisticas: Estatistica[] = [];
  recentes: EnvioRecente[] = [];

  ngOnInit() {
    this.email = this.sessao.usuario?.email ?? '';
    this.nome = this.sessao.primeiroNome;
    this.saudacao = this.calcularSaudacao();
    this.carregar();
  }

  private carregar() {
    const lista = this.envios.listar(this.email);
    const agora = new Date();

    const aprovados = lista.filter((e) => e.status === 'Aprovado').length;
    const emAnalise = lista.filter((e) => e.status === 'Em análise').length;
    const doMes = lista.filter((e) => {
      const data = new Date(e.enviadoEm);
      return data.getFullYear() === agora.getFullYear() && data.getMonth() === agora.getMonth();
    }).length;

    this.estatisticas = [
      { valor: aprovados, legenda: 'trabalhos no acervo' },
      { valor: emAnalise, legenda: 'aguardando avaliação' },
      { valor: doMes, legenda: 'enviados este mês' },
    ];

    this.recentes = lista.slice(0, 5).map((e) => this.paraRecente(e));
  }

  private paraRecente(e: Envio): EnvioRecente {
    return {
      id: e.id,
      titulo: e.titulo,
      detalhe: `${e.autor} · ${e.curso} · ${this.descreverQuando(e.enviadoEm)}`,
      status: e.status,
    };
  }

  private descreverQuando(iso: string): string {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const data = new Date(iso);
    data.setHours(0, 0, 0, 0);

    const dias = Math.round((hoje.getTime() - data.getTime()) / 86400000);
    if (dias <= 0) return 'enviado hoje';
    if (dias === 1) return 'enviado ontem';
    if (dias <= 30) return `enviado há ${dias} dias`;
    return `enviado em ${data.toLocaleDateString('pt-BR')}`;
  }

  private calcularSaudacao(): string {
    const hora = new Date().getHours();
    if (hora < 12) return 'Bom dia';
    if (hora < 18) return 'Boa tarde';
    return 'Boa noite';
  }
}