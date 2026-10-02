import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
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
    this.aguardando = lista.filter((e) => e.status === 'Em análise').length;

    this.estatisticas = [
      { valor: lista.length, legenda: 'trabalhos enviados' },
      { valor: this.aguardando, legenda: 'aguardando avaliação' },
      { valor: lista.filter((e) => e.status === 'Aprovado').length, legenda: 'aprovados' },
      { valor: lista.filter((e) => e.status === 'Reprovado').length, legenda: 'reprovados' },
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