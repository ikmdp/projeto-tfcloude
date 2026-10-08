import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Envio, Envios, dataUltimoEnvio } from '../servicos/envios';
import { Atividades } from '../servicos/atividades';
import { Sessao } from '../servicos/sessao';
import { descreverQuando, formatarDataHora, rotuloEvento } from '../servicos/formatacao';

interface ItemHistorico {
  rotulo: string;
  quando: string;
  por: string;
  motivo?: string;
}

interface ItemFila {
  id: string;
  titulo: string;
  detalhe: string;
    responsaveis: string;
  versao: number;
  historico: ItemHistorico[];
}

interface Aviso {
  id: string;
  texto: string;
}

type DecisaoComMotivo = 'ajustes' | 'reprovado';

@Component({
  selector: 'app-avaliacao',
  imports: [FormsModule],
  templateUrl: './avaliacao.html',
  styleUrl: './avaliacao.css',
})
export class Avaliacao implements OnInit {
  private envios = inject(Envios);
  private atividades = inject(Atividades);
  private sessao = inject(Sessao);

  fila: ItemFila[] = [];
  aviso: Aviso | null = null;

  decisaoId: string | null = null;
  decisaoTipo: DecisaoComMotivo = 'ajustes';
  motivo = '';
  erroMotivo = '';

  historicoAberto: string | null = null;

  ngOnInit() {
    this.carregar();
  }

  private get nomeAdmin(): string {
    return this.sessao.usuario?.nome ?? 'Coordenação';
  }

  aprovar(item: ItemFila) {
    const envio = this.envios.decidir(item.id, 'aprovado', this.nomeAdmin);
    if (!envio) {
      this.carregar();
      return;
    }

    this.atividades.registrar(this.nomeAdmin, 'Trabalho aprovado', this.descricao(envio));
    this.aviso = { id: item.id, texto: `"${envio.titulo}" foi aprovado e entrou no acervo.` };
    this.fecharDecisao();
    this.carregar();
  }

  abrirDecisao(item: ItemFila, tipo: DecisaoComMotivo) {
    this.decisaoId = item.id;
    this.decisaoTipo = tipo;
    this.motivo = '';
    this.erroMotivo = '';
  }

  cancelarDecisao() {
    this.fecharDecisao();
  }

  confirmarDecisao(item: ItemFila) {
    const texto = this.motivo.trim();
    const tipo = this.decisaoTipo;

    if (texto.length < 10) {
      this.erroMotivo =
        tipo === 'ajustes'
          ? 'Descreva o que o aluno precisa corrigir (mínimo de 10 caracteres).'
          : 'Informe o motivo da reprovação (mínimo de 10 caracteres).';
      return;
    }

    const envio = this.envios.decidir(item.id, tipo, this.nomeAdmin, texto);
    if (!envio) {
      this.fecharDecisao();
      this.carregar();
      return;
    }

    this.atividades.registrar(
      this.nomeAdmin,
      tipo === 'ajustes' ? 'Ajustes solicitados' : 'Trabalho reprovado',
      this.descricao(envio),
    );
    this.aviso = {
      id: item.id,
      texto:
        tipo === 'ajustes'
          ? `"${envio.titulo}" foi devolvido ao aluno para ajustes.`
          : `"${envio.titulo}" foi reprovado.`,
    };
    this.fecharDecisao();
    this.carregar();
  }

  desfazer() {
    if (!this.aviso) return;

    const envio = this.envios.obter(this.aviso.id);
    if (this.envios.desfazerDecisao(this.aviso.id) && envio) {
      this.atividades.registrar(this.nomeAdmin, 'Decisão desfeita', this.descricao(envio));
    }
    this.aviso = null;
    this.carregar();
  }

  fecharAviso() {
    this.aviso = null;
  }

  alternarHistorico(id: string) {
    this.historicoAberto = this.historicoAberto === id ? null : id;
  }

  private fecharDecisao() {
    this.decisaoId = null;
    this.motivo = '';
    this.erroMotivo = '';
  }

  private descricao(envio: Envio): string {
    return `${envio.titulo} · ${envio.autor}`;
  }

  private carregar() {
    this.fila = this.envios.listarEmAnalise().map((e) => ({
      id: e.id,
      titulo: e.titulo,
      versao: e.versao,
            detalhe: `${e.autor} · ${e.curso}${e.turma ? ' · ' + e.turma : ''}${e.turno ? ' · ' + e.turno : ''} · ${e.versao > 1 ? 'reenviado' : 'enviado'} ${descreverQuando(dataUltimoEnvio(e))}`,
      responsaveis: `Orientador(a): ${e.orientador || 'não informado'} · Enviado por: ${e.enviadoPor || 'não informado'}`,
      historico: e.historico.map((ev) => ({
        rotulo: rotuloEvento(ev.tipo),
        quando: formatarDataHora(ev.em),
        por: ev.por,
        motivo: ev.motivo,
      })),
    }));
  }
}