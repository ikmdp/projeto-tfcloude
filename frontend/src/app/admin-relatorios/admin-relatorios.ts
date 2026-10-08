import { Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Envios } from '../servicos/envios';
import { Catalogo } from '../servicos/catalogo';
import { Professores } from '../servicos/professores';
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

interface Grupo {
  chave: string; // nome da coluna "Agrupamento" no CSV
  titulo: string;
  coluna: string;
  linhas: LinhaTabela[];
  maximo: number;
  comTotal: boolean;
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
  private cadastroProfessores = inject(Professores);
  private atividades = inject(Atividades);
  private sessao = inject(Sessao);
  private relatorios = inject(Relatorios);
  private ehNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  relatorio: Relatorio | null = null;
  cartoes: Cartao[] = [];
  grupos: Grupo[] = [];
  aviso = '';

  ngOnInit() {
    const relatorio = this.relatorios.calcular(
      this.envios.listarTodos(),
      this.catalogo.listarCursos(),
      this.cadastroProfessores.listar().map((p) => p.nome),
    );
    const { resumo } = relatorio;

    this.relatorio = relatorio;

    this.grupos = [
      this.criarGrupo('Curso', 'Por curso', 'Curso', relatorio.porCurso, true),
      this.criarGrupo('Turno', 'Por turno', 'Turno', relatorio.porTurno, false),
      this.criarGrupo(
        'Professor (envio)',
        'Por professor que enviou',
        'Professor',
        relatorio.porProfessor,
        false,
      ),
      this.criarGrupo('Ano', 'Por ano de envio', 'Ano', relatorio.porAno, false),
    ];

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

  private criarGrupo(
    chave: string,
    titulo: string,
    coluna: string,
    linhas: LinhaTabela[],
    comTotal: boolean,
  ): Grupo {
    return {
      chave,
      titulo,
      coluna,
      linhas,
      comTotal,
      maximo: Math.max(0, ...linhas.map((l) => l.enviados)),
    };
  }

  /** Largura da barra, de 0 a 100, em relação à linha com mais envios do grupo. */
  largura(linha: LinhaTabela, grupo: Grupo): number {
    return grupo.maximo ? (linha.enviados / grupo.maximo) * 100 : 0;
  }

  // ---------- Exportação ----------
  exportarTrabalhos() {
    if (!this.ehNavegador || !this.temDados) return;

    const linhas: (string | number | undefined)[][] = [
      [
        'Título',
        'Alunos',
        'Turma',
        'Turno',
        'Curso',
        'Professor orientador',
        'Enviado por',
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
        e.alunos.join('; '),
        e.turma,
        e.turno,
        e.curso,
        e.orientador,
        e.enviadoPor,
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

    const linha = (grupo: string, l: LinhaTabela) => [
      grupo,
      l.rotulo,
      l.enviados,
      l.aprovados,
      l.reprovados,
      l.emAndamento,
      l.removidos,
    ];

    const linhas: (string | number)[][] = [
      ['Agrupamento', 'Valor', 'Enviados', 'Aprovados', 'Reprovados', 'Em andamento', 'Removidos'],
    ];
    for (const g of this.grupos) {
      for (const l of g.linhas) linhas.push(linha(g.chave, l));
    }
    linhas.push(linha('Total', this.relatorio.total));

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