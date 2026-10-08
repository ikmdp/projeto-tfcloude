import { Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Sessao } from '../servicos/sessao';
import { Envios, resumoAlunos } from '../servicos/envios';
import { Atividades } from '../servicos/atividades';
import { Catalogo } from '../servicos/catalogo';
import { Professores } from '../servicos/professores';

type Campo = 'titulo' | 'alunos' | 'turma' | 'orientador' | 'palavras';

interface LinhaAluno {
  id: number;
  nome: string;
}

const TAMANHO_MAXIMO = 25 * 1024 * 1024; // 25 MB
const MAX_PALAVRAS = 8;
const MAX_ALUNOS = 6;

@Component({
  selector: 'app-enviar-tfc',
  imports: [FormsModule],
  templateUrl: './enviar-tfc.html',
  styleUrl: './enviar-tfc.css',
})
export class EnviarTfc implements OnInit {
  private router = inject(Router);
  private rota = inject(ActivatedRoute);
  private sessao = inject(Sessao);
  private envios = inject(Envios);
  private atividades = inject(Atividades);
  private catalogo = inject(Catalogo);
  private cadastroProfessores = inject(Professores);
  private ehNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  // Preenchido só no modo "corrigir e reenviar"
  idCorrecao: string | null = this.rota.snapshot.paramMap.get('id');
  motivoAjustes = '';
  versaoAtual = 1;
  arquivoAnterior = '';

  readonly maxAlunos = MAX_ALUNOS;
  turnos = ['Manhã', 'Tarde', 'Noite', 'Integral'];
  cursos = this.catalogo.listarCursos();
  professores: string[] = this.cadastroProfessores.listar().map((p) => p.nome);

  titulo = '';
  alunos: LinhaAluno[] = [{ id: 1, nome: '' }];
  private proximoId = 2;
  turma = '';
  turno = this.turnos[0];
  curso = this.cursos[0] ?? '';
  orientador = '';
  enviadoPor = '';
  entradaPalavra = '';
  palavras: string[] = [];

  arquivo: File | null = null;
  erroArquivo = '';
  arrastando = false;

  tentouEnviar = false;
  tocados: Record<Campo, boolean> = {
    titulo: false,
    alunos: false,
    turma: false,
    orientador: false,
    palavras: false,
  };

  get modoCorrecao(): boolean {
    return this.idCorrecao !== null;
  }

  ngOnInit() {
    const usuario = this.sessao.usuario;
    this.enviadoPor = usuario?.nome ?? '';

    // Por padrão, quem envia também orienta. Dá para escolher outro professor.
    if (usuario && this.professores.includes(usuario.nome)) {
      this.orientador = usuario.nome;
    }

    if (!this.idCorrecao || !this.ehNavegador) return;

    const envio = usuario ? this.envios.obterDoUsuario(usuario.email, this.idCorrecao) : null;

    // Só dá para corrigir um trabalho seu que foi devolvido para ajustes
    if (!envio || envio.status !== 'Ajustes solicitados') {
      this.router.navigate(['/painel']);
      return;
    }

    this.titulo = envio.titulo;
    this.curso = envio.curso;
    this.turma = envio.turma;
    this.turno = envio.turno || this.turnos[0];
    this.orientador = envio.orientador ?? '';
    this.palavras = [...(envio.palavrasChave ?? [])];
    this.motivoAjustes = envio.motivo ?? '';
    this.versaoAtual = envio.versao;
    this.arquivoAnterior = envio.arquivoNome ?? '';

    this.alunos = envio.alunos.map((nome) => ({ id: this.proximoId++, nome }));
    if (this.alunos.length === 0) this.alunos = [{ id: this.proximoId++, nome: '' }];

    // Mantém nas listas o que o trabalho já tinha, mesmo que o cadastro tenha mudado depois
    if (!this.cursos.includes(this.curso)) this.cursos = [...this.cursos, this.curso];
    if (!this.turnos.includes(this.turno)) this.turnos = [...this.turnos, this.turno];
    if (this.orientador && !this.professores.includes(this.orientador)) {
      this.professores = [...this.professores, this.orientador];
    }
  }

  // ---------- Alunos ----------
  adicionarAluno() {
    if (this.alunos.length >= MAX_ALUNOS) return;
    this.alunos.push({ id: this.proximoId++, nome: '' });
  }

  removerAluno(id: number) {
    if (this.alunos.length <= 1) return;
    this.alunos = this.alunos.filter((a) => a.id !== id);
  }

  /** Nomes preenchidos, sem espaços sobrando. */
  get nomesAlunos(): string[] {
    return this.alunos.map((a) => a.nome.trim().replace(/\s+/g, ' ')).filter((n) => n.length > 0);
  }

  private get alunosRepetidos(): boolean {
    const nomes = this.nomesAlunos.map((n) => this.normalizar(n));
    return new Set(nomes).size !== nomes.length;
  }

  // ---------- Regras ----------
  get tituloValido(): boolean {
    return this.titulo.trim().length >= 5;
  }

  get alunosValidos(): boolean {
    const nomes = this.nomesAlunos;
    return nomes.length >= 1 && nomes.every((n) => n.length >= 3) && !this.alunosRepetidos;
  }

  get turmaValida(): boolean {
    return this.turma.trim().length >= 2;
  }

  get orientadorValido(): boolean {
    return this.orientador.trim().length > 0;
  }

  get palavrasValidas(): boolean {
    return this.palavras.length >= 1;
  }

  get formularioValido(): boolean {
    return (
      !!this.arquivo &&
      this.tituloValido &&
      this.alunosValidos &&
      this.turmaValida &&
      this.orientadorValido &&
      this.palavrasValidas
    );
  }

  // ---------- Mensagens ----------
  get erroTitulo(): string {
    if (!this.deveMostrar('titulo')) return '';
    return this.tituloValido ? '' : 'Informe o título do trabalho.';
  }

  get erroAlunos(): string {
    if (!this.deveMostrar('alunos')) return '';
    const nomes = this.nomesAlunos;
    if (nomes.length === 0) return 'Informe o nome de pelo menos um aluno.';
    if (nomes.some((n) => n.length < 3)) return 'Cada nome de aluno precisa ter pelo menos 3 letras.';
    if (this.alunosRepetidos) return 'Há alunos com o mesmo nome.';
    return '';
  }

  get erroTurma(): string {
    if (!this.deveMostrar('turma')) return '';
    return this.turmaValida ? '' : 'Informe a turma (ex: 3º A).';
  }

  get erroOrientador(): string {
    if (!this.deveMostrar('orientador')) return '';
    return this.orientadorValido ? '' : 'Selecione o professor orientador(a).';
  }

  get erroPalavras(): string {
    if (!this.deveMostrar('palavras')) return '';
    return this.palavrasValidas ? '' : 'Adicione pelo menos uma palavra-chave.';
  }

  get erroArquivoMostrado(): string {
    if (this.erroArquivo) return this.erroArquivo;
    if (this.tentouEnviar && !this.arquivo) {
      return this.modoCorrecao
        ? 'Anexe a versão corrigida do trabalho em PDF.'
        : 'Anexe o arquivo do trabalho em PDF.';
    }
    return '';
  }

  marcar(campo: Campo) {
    this.tocados[campo] = true;
  }

  private deveMostrar(campo: Campo): boolean {
    return this.tocados[campo] || this.tentouEnviar;
  }

  // ---------- Arquivo ----------
  escolher(evento: Event) {
    const input = evento.target as HTMLInputElement;
    this.receberArquivo(input.files?.[0]);
    input.value = ''; // permite escolher o mesmo arquivo de novo
  }

  aoArrastar(evento: DragEvent) {
    evento.preventDefault();
    this.arrastando = true;
  }

  aoSairDoArraste(evento: DragEvent) {
    evento.preventDefault();
    this.arrastando = false;
  }

  aoSoltar(evento: DragEvent) {
    evento.preventDefault();
    this.arrastando = false;
    this.receberArquivo(evento.dataTransfer?.files?.[0]);
  }

  removerArquivo() {
    this.arquivo = null;
    this.erroArquivo = '';
  }

  private receberArquivo(arquivo?: File) {
    if (!arquivo) return;

    const ehPdf =
      arquivo.type === 'application/pdf' || arquivo.name.toLowerCase().endsWith('.pdf');

    if (!ehPdf) {
      this.arquivo = null;
      this.erroArquivo = 'O arquivo precisa estar em PDF.';
      return;
    }

    if (arquivo.size > TAMANHO_MAXIMO) {
      this.arquivo = null;
      this.erroArquivo = 'O arquivo passa do limite de 25 MB.';
      return;
    }

    this.erroArquivo = '';
    this.arquivo = arquivo;
  }

  formatarTamanho(bytes: number): string {
    if (bytes < 1024 * 1024) {
      return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
  }

  // ---------- Palavras-chave ----------
  aoTeclarPalavra(evento: KeyboardEvent) {
    if (evento.key === 'Enter' || evento.key === ',') {
      evento.preventDefault();
      this.adicionarPalavra();
    } else if (evento.key === 'Backspace' && !this.entradaPalavra && this.palavras.length) {
      this.palavras.pop();
    }
  }

  aoSairDaPalavra() {
    this.adicionarPalavra();
    this.marcar('palavras');
  }

  adicionarPalavra() {
    const texto = this.entradaPalavra.trim().replace(/,+$/, '');
    this.entradaPalavra = '';
    if (!texto) return;

    const repetida = this.palavras.some((p) => p.toLowerCase() === texto.toLowerCase());
    if (repetida || this.palavras.length >= MAX_PALAVRAS) return;

    this.palavras.push(texto);
  }

  removerPalavra(indice: number) {
    this.palavras.splice(indice, 1);
  }

  // ---------- Envio ----------
  enviar() {
    this.adicionarPalavra(); // aproveita o que foi digitado e não confirmado
    this.tentouEnviar = true;

    if (!this.formularioValido || !this.arquivo) return;

    const usuario = this.sessao.usuario;
    if (!usuario) {
      this.router.navigate(['/login']);
      return;
    }

    const alunos = this.nomesAlunos;
    const titulo = this.titulo.trim();

    // Provisório: guarda só os dados do envio (nome e tamanho do PDF).
    // O arquivo em si será enviado ao backend na Parte 2.
    if (this.idCorrecao) {
      const reenviado = this.envios.reenviar(
        usuario.email,
        this.idCorrecao,
        {
          titulo,
          curso: this.curso,
          orientador: this.orientador,
          alunos,
          turma: this.turma.trim(),
          turno: this.turno,
          palavrasChave: [...this.palavras],
          arquivoNome: this.arquivo.name,
          arquivoTamanho: this.arquivo.size,
        },
        usuario.nome,
      );

      if (reenviado) {
        this.atividades.registrar(
          usuario.nome,
          'Trabalho reenviado',
          `${reenviado.titulo} · ${reenviado.autor} · versão ${reenviado.versao}`,
        );
      }
      this.router.navigate(['/painel']);
      return;
    }

    this.envios.adicionar(usuario.email, {
      titulo,
      alunos,
      turma: this.turma.trim(),
      turno: this.turno,
      curso: this.curso,
      orientador: this.orientador,
      enviadoPor: usuario.nome,
      palavrasChave: [...this.palavras],
      arquivoNome: this.arquivo.name,
      arquivoTamanho: this.arquivo.size,
      enviadoEm: new Date().toISOString(),
      status: 'Em análise',
    });
    this.atividades.registrar(usuario.nome, 'Trabalho enviado', `${titulo} · ${resumoAlunos(alunos)}`);

    this.router.navigate(['/painel']);
  }

  /** Tira acentos e maiúsculas: "José" e "jose" contam como iguais. */
  private normalizar(texto: string): string {
    return texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }
}