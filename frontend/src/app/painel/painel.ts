import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Sessao } from '../servicos/sessao';
import { Envio, Envios, StatusEnvio, dataUltimoEnvio } from '../servicos/envios';
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
  motivo: string;
}

interface Pendente {
  id: string;
  titulo: string;
  detalhe: string;
  motivo: string;
}

@Component({
  selector: 'app-painel',
  imports: [RouterLink],
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
  pendentes: Pendente[] = [];

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

    this.pendentes = lista
      .filter((e) => e.status === 'Ajustes solicitados')
      .map((e) => this.paraPendente(e));

    this.recentes = lista.slice(0, 5).map((e) => ({
      id: e.id,
      titulo: e.titulo,
      detalhe: `${e.autor} · ${e.curso} · ${e.versao > 1 ? 'reenviado' : 'enviado'} ${descreverQuando(dataUltimoEnvio(e))}`,
      status: e.status,
            motivo: e.status === 'Reprovado' || e.status === 'Removido' ? (e.motivo ?? '') : '',
    }));
  }

  private paraPendente(e: Envio): Pendente {
    const devolucao = [...e.historico].reverse().find((ev) => ev.tipo === 'ajustes');
    const quando = devolucao ? ` · devolvido ${descreverQuando(devolucao.em)}` : '';
    return {
      id: e.id,
      titulo: e.titulo,
      detalhe: `${e.curso}${quando}`,
      motivo: e.motivo ?? 'A coordenação não informou detalhes.',
    };
  }

  private calcularSaudacao(): string {
    const hora = new Date().getHours();
    if (hora < 12) return 'Bom dia';
    if (hora < 18) return 'Boa tarde';
    return 'Boa noite';
  }
}