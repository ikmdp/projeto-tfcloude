import { Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Envios } from '../servicos/envios';
import { Catalogo } from '../servicos/catalogo';
import { Atividades } from '../servicos/atividades';
import { Sessao } from '../servicos/sessao';
import { formatarDataHora } from '../servicos/formatacao';
import { baixarCsv, gerarCsv } from '../servicos/csv';
import { LinhaTabela, Relatorio, Relatorios, formatarDuracao } from '../servicos/relatorios';

interface Cartao {
  valor: string;
  legenda: string;
  dica: string;
}

@Component({
  selector: 'app-admin-relatorios',
  imports: [],
  templateUrl: './admin-relatorios.html',
  styleUrl: './admin-relatorios.css',
})
export class AdminRelatorios implements OnInit {
  private envios = inject(Envios);
  private catalogo = inject(Catalogo);
  private atividades = inject(Atividades);
  private sessao = inject(Sessao);
  private relatorios = inject(Relatorios);
  private ehNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  relatorio: Relatorio | null = null;
  cartoes: Cartao[] = [];
  maiorEnvio = 0;
  aviso = '';

  ngOnInit() {
    const relatorio = this.relatorios.calcular(
      this.envios.listarTodos(),
      this.catalogo.listarCursos(),
    );
    const { resumo } = relatorio;

    this.relatorio = relatorio;
    this.maiorEnvio = Math.max(0, ...relatorio.porCurso.map((l) => l.enviados));

    this.cartoes = [
      {
        valor: String(relatorio.total.enviados),
        legenda: 'trabalhos enviados',
        dica: 'todos os cursos e anos',
      },
      {
        valor: resumo.taxaAprovacao === null ? '—' : `${resumo.taxaAprovacao}%`,
        legenda: 'taxa de aprovação',
        dica: 'aprovados entre as decisões finais',
      },
      {
        valor: resumo.tempoMedioMs === null ? '—' : formatarDuracao(resumo.tempoMedioMs),
        legenda: 'tempo médio de avaliação',
        dica: resumo.avaliacoes
          ? `baseado em ${resumo.avaliacoes} ${resumo.avaliacoes === 1 ? 'avaliação' : 'avaliações'}`
          : 'sem avaliações ainda',
      },
      {
        valor: resumo.maiorEsperaMs === null ? '—' : formatarDuracao(resumo.maiorEsperaMs),
        legenda: 'maior espera na fila',
        dica: resumo.naFila
          ? `${resumo.naFila} ${resumo.naFila === 1 ? 'trabalho' : 'trabalhos'} na fila`
          : 'fila vazia',
      },
    ];
  }

  get temDados(): boolean {
    return (this.relatorio?.total.enviados ?? 0) > 0;
  }

  /** Largura da barra, de 0 a 100, em relação ao curso com mais envios. */
  largura(linha: LinhaTabela): number {
    return this.maiorEnvio ? (linha.enviados / this.maiorEnvio) * 100 : 0;
  }

  // ---------- Exportação ----------
  exportarTrabalhos() {
    if (!this.ehNavegador || !this.temDados) return;

    const linhas: (string | number | undefined)[][] = [
      [
        'Título',
        'Autor',
        'Curso',
        'Orientador',
        'Palavras-chave',
        'Status',
        'Versão',
        'Enviado em',
        'Motivo',
        'Arquivo',
        'Tamanho (KB)',
      ],
    ];

    for (const e of this.envios.listarTodos()) {
      linhas.push([
        e.titulo,
        e.autor,
        e.curso,
        e.orientador,
        (e.palavrasChave ?? []).join('; '),
        e.status,
        e.versao,
        formatarDataHora(e.enviadoEm),
        e.motivo,
        e.arquivoNome,
        e.arquivoTamanho ? Math.round(e.arquivoTamanho / 1024) : undefined,
      ]);
    }

    const nome = `tfcloud-trabalhos-${this.hoje()}.csv`;
    baixarCsv(nome, gerarCsv(linhas));
    this.concluir('Trabalhos', nome, linhas.length - 1);
  }

  exportarResumo() {
    if (!this.ehNavegador || !this.relatorio) return;

    const cabecalho = [
      'Agrupamento',
      'Valor',
      'Enviados',
      'Aprovados',
      'Reprovados',
      'Em andamento',
      'Removidos',
    ];
    const linha = (grupo: string, l: LinhaTabela) => [
      grupo,
      l.rotulo,
      l.enviados,
      l.aprovados,
      l.reprovados,
      l.emAndamento,
      l.removidos,
    ];

    const linhas = [
      cabecalho,
      ...this.relatorio.porCurso.map((l) => linha('Curso', l)),
      ...this.relatorio.porAno.map((l) => linha('Ano', l)),
      linha('Total', this.relatorio.total),
    ];

    const nome = `tfcloud-resumo-${this.hoje()}.csv`;
    baixarCsv(nome, gerarCsv(linhas));
    this.concluir('Resumo', nome, linhas.length - 1);
  }

  private concluir(tipo: string, nome: string, quantidade: number) {
    const nomeAdmin = this.sessao.usuario?.nome ?? 'Coordenação';
    this.atividades.registrar(
      nomeAdmin,
      'Relatório exportado',
      `${tipo} (CSV) · ${quantidade} ${quantidade === 1 ? 'linha' : 'linhas'}`,
    );
    this.aviso = `Arquivo ${nome} gerado.`;
  }

  private hoje(): string {
    const d = new Date();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mes}-${dia}`;
  }
}