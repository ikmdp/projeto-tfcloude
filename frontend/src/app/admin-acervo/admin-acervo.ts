import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Envio, Envios } from '../servicos/envios';
import { Catalogo } from '../servicos/catalogo';
import { Professores } from '../servicos/professores';
import { Atividades } from '../servicos/atividades';
import { Sessao } from '../servicos/sessao';

type Aba = 'acervo' | 'removidos';

const MAX_PALAVRAS = 8;
const MAX_ALUNOS = 6;
const TURNOS = ['Manhã', 'Tarde', 'Noite', 'Integral'];

@Component({
  selector: 'app-admin-acervo',
  imports: [FormsModule],
  templateUrl: './admin-acervo.html',
  styleUrl: './admin-acervo.css',
})
export class AdminAcervo implements OnInit {
  private envios = inject(Envios);
  private catalogo = inject(Catalogo);
  private cadastroProfessores = inject(Professores);
  private atividades = inject(Atividades);
  private sessao = inject(Sessao);

  aba: Aba = 'acervo';
  consulta = '';
  cursoAtual = 'Todos';
  opcoes = ['Todos', ...this.catalogo.listarCursos()];

  noAcervo: Envio[] = [];
  removidos: Envio[] = [];
  lista: Envio[] = [];

  aviso = '';

  // ---------- Edição ----------
  editandoId: string | null = null;
  edTitulo = '';
  edAlunos = '';
  edTurma = '';
  edTurno = '';
  edCurso = '';
  edOrientador = '';
  edPalavras = '';
  erroEdicao = '';
  cursosEdicao: string[] = [];
  turnosEdicao: string[] = [];
  professoresEdicao: string[] = [];
  private original: Envio | null = null;

  // ---------- Remoção ----------
  removendoId: string | null = null;
  motivoRemocao = '';
  erroRemocao = '';

  ngOnInit() {
    this.carregar();
  }

  private get nomeAdmin(): string {
    return this.sessao.usuario?.nome ?? 'Coordenação';
  }

  // ---------- Lista ----------
  trocarAba(aba: Aba) {
    this.aba = aba;
    this.aviso = '';
    this.fecharPaineis();
    this.filtrar();
  }

  escolherCurso(curso: string) {
    this.cursoAtual = curso;
    this.filtrar();
  }

  filtrar() {
    const base = this.aba === 'acervo' ? this.noAcervo : this.removidos;
    const palavras = this.normalizar(this.consulta).split(/\s+/).filter(Boolean);

    this.lista = base.filter((e) => {
      if (this.cursoAtual !== 'Todos' && e.curso !== this.cursoAtual) return false;
      if (!palavras.length) return true;

      const texto = this.normalizar(
        [
          e.titulo,
          ...e.alunos,
          e.autor,
          e.curso,
          e.turma,
          e.turno,
          e.orientador ?? '',
          e.enviadoPor,
          ...(e.palavrasChave ?? []),
        ].join(' '),
      );
      return palavras.every((p) => texto.includes(p));
    });
  }

  detalhe(e: Envio): string {
    const ano = new Date(e.enviadoEm).getFullYear();
    const turma = e.turma ? ` · ${e.turma}` : '';
    const turno = e.turno ? ` · ${e.turno}` : '';
    return `${e.autor} · ${e.curso}${turma}${turno} · ${ano}`;
  }

  responsaveis(e: Envio): string {
    return `Orientador(a): ${e.orientador || 'não informado'} · Enviado por: ${e.enviadoPor || 'não informado'}`;
  }

  // ---------- Editar ----------
  iniciarEdicao(e: Envio) {
    this.fecharPaineis();
    this.original = e;
    this.editandoId = e.id;
    this.edTitulo = e.titulo;
    this.edAlunos = e.alunos.join('\n');
    this.edTurma = e.turma;
    this.edTurno = e.turno;
    this.edCurso = e.curso;
    this.edOrientador = e.orientador ?? '';
    this.edPalavras = (e.palavrasChave ?? []).join(', ');
    this.erroEdicao = '';

    // Mantém nas listas o que o trabalho já tem, mesmo que tenha saído do cadastro
    const cursos = this.catalogo.listarCursos();
    this.cursosEdicao = cursos.includes(e.curso) ? cursos : [...cursos, e.curso];

    this.turnosEdicao = e.turno && !TURNOS.includes(e.turno) ? [...TURNOS, e.turno] : [...TURNOS];

    const professores = this.cadastroProfessores.listar().map((p) => p.nome);
    this.professoresEdicao =
      !e.orientador || professores.includes(e.orientador)
        ? professores
        : [...professores, e.orientador];
  }

  cancelarEdicao() {
    this.editandoId = null;
    this.original = null;
    this.erroEdicao = '';
  }

  salvarEdicao() {
    const envio = this.original;
    if (!envio) return;

    const titulo = this.edTitulo.trim().replace(/\s+/g, ' ');
    const turma = this.edTurma.trim().replace(/\s+/g, ' ');
    const alunos = this.separarAlunos(this.edAlunos);
    const palavras = this.separarPalavras(this.edPalavras);

    if (titulo.length < 5) {
      this.erroEdicao = 'Informe o título do trabalho.';
      return;
    }
    if (alunos.length === 0) {
      this.erroEdicao = 'Informe o nome de pelo menos um aluno.';
      return;
    }
    if (alunos.length > MAX_ALUNOS) {
      this.erroEdicao = `O trabalho pode ter no máximo ${MAX_ALUNOS} alunos.`;
      return;
    }
    if (alunos.some((a) => a.length < 3)) {
      this.erroEdicao = 'Cada nome de aluno precisa ter pelo menos 3 letras.';
      return;
    }
    if (new Set(alunos.map((a) => this.normalizar(a))).size !== alunos.length) {
      this.erroEdicao = 'Há alunos com o mesmo nome.';
      return;
    }

    // Trabalhos antigos podem não ter turma: nesse caso ela pode continuar vazia
    const turmaOk = turma.length >= 2 || (turma === '' && envio.turma === '');
    if (!turmaOk) {
      this.erroEdicao = 'Informe a turma (ex: 3º A).';
      return;
    }

    if (!this.edOrientador) {
      this.erroEdicao = 'Selecione o professor orientador(a).';
      return;
    }
    if (palavras.length === 0) {
      this.erroEdicao = 'Informe pelo menos uma palavra-chave.';
      return;
    }

    const mudou: string[] = [];
    if (titulo !== envio.titulo) mudou.push('título');
    if (alunos.join('|') !== envio.alunos.join('|')) mudou.push('alunos');
    if (turma !== envio.turma) mudou.push('turma');
    if (this.edTurno !== envio.turno) mudou.push('turno');
    if (this.edCurso !== envio.curso) mudou.push('curso');
    if (this.edOrientador !== (envio.orientador ?? '')) mudou.push('orientador');
    if (palavras.join('|') !== (envio.palavrasChave ?? []).join('|')) mudou.push('palavras-chave');

    if (mudou.length === 0) {
      this.erroEdicao = 'Nenhuma alteração foi feita.';
      return;
    }

    const resumo = `Alterou: ${mudou.join(', ')}`;
    const atualizado = this.envios.editar(
      envio.id,
      {
        titulo,
        curso: this.edCurso,
        orientador: this.edOrientador,
        palavrasChave: palavras,
        alunos,
        turma,
        turno: this.edTurno,
      },
      this.nomeAdmin,
      resumo,
    );

    if (!atualizado) {
      this.erroEdicao = 'Este trabalho não está mais no acervo.';
      this.carregar();
      return;
    }

    this.atividades.registrar(this.nomeAdmin, 'Trabalho editado', `${titulo} · ${resumo}`);
    this.aviso = `"${titulo}" foi atualizado.`;
    this.cancelarEdicao();
    this.carregar();
  }

  // ---------- Remover e restaurar ----------
  iniciarRemocao(e: Envio) {
    this.fecharPaineis();
    this.removendoId = e.id;
    this.motivoRemocao = '';
    this.erroRemocao = '';
  }

  cancelarRemocao() {
    this.removendoId = null;
    this.motivoRemocao = '';
    this.erroRemocao = '';
  }

  confirmarRemocao(e: Envio) {
    const motivo = this.motivoRemocao.trim();
    if (motivo.length < 10) {
      this.erroRemocao = 'Informe o motivo da remoção (mínimo de 10 caracteres).';
      return;
    }

    const removido = this.envios.removerDoAcervo(e.id, this.nomeAdmin, motivo);
    if (!removido) {
      this.cancelarRemocao();
      this.carregar();
      return;
    }

    this.atividades.registrar(
      this.nomeAdmin,
      'Trabalho removido do acervo',
      `${e.titulo} · ${e.autor}`,
    );
    this.aviso = `"${e.titulo}" foi removido do acervo.`;
    this.cancelarRemocao();
    this.carregar();
  }

  restaurar(e: Envio) {
    const restaurado = this.envios.restaurarAoAcervo(e.id, this.nomeAdmin);
    if (!restaurado) {
      this.carregar();
      return;
    }

    this.atividades.registrar(
      this.nomeAdmin,
      'Trabalho restaurado ao acervo',
      `${e.titulo} · ${e.autor}`,
    );
    this.aviso = `"${e.titulo}" voltou ao acervo.`;
    this.carregar();
  }

  // ---------- Internos ----------
  private carregar() {
    const todos = this.envios.listarTodos();
    this.noAcervo = todos.filter((e) => e.status === 'Aprovado');
    this.removidos = todos.filter((e) => e.status === 'Removido');
    this.filtrar();
  }

  private fecharPaineis() {
    this.cancelarEdicao();
    this.cancelarRemocao();
  }

  /** Um nome por linha. */
  private separarAlunos(texto: string): string[] {
    return texto
      .split(/\r?\n/)
      .map((n) => n.trim().replace(/\s+/g, ' '))
      .filter((n) => n.length > 0);
  }

  /** "iot, sensores ; energia" vira ['iot', 'sensores', 'energia'], sem repetidas. */
  private separarPalavras(texto: string): string[] {
    const resultado: string[] = [];
    for (const parte of texto.split(/[,;]/)) {
      const palavra = parte.trim().replace(/\s+/g, ' ');
      if (!palavra) continue;
      if (resultado.some((p) => p.toLowerCase() === palavra.toLowerCase())) continue;
      resultado.push(palavra);
    }
    return resultado.slice(0, MAX_PALAVRAS);
  }

  /** Tira acentos e maiúsculas: "Energía" e "energia" contam como iguais. */
  private normalizar(texto: string): string {
    return texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }
}