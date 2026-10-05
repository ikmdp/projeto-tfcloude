import { Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Sessao } from '../servicos/sessao';
import { Envios } from '../servicos/envios';
import { Atividades } from '../servicos/atividades';
import { Catalogo } from '../servicos/catalogo';

type Campo = 'titulo' | 'orientador' | 'palavras';

const TAMANHO_MAXIMO = 25 * 1024 * 1024; // 25 MB
const MAX_PALAVRAS = 8;

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
  private ehNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  // Preenchido só no modo "corrigir e reenviar"
  idCorrecao: string | null = this.rota.snapshot.paramMap.get('id');
  motivoAjustes = '';
  versaoAtual = 1;
  arquivoAnterior = '';

  // Listas cadastradas pela coordenação
  cursos = this.catalogo.listarCursos();
  orientadores = this.catalogo.listarOrientadores();

  titulo = '';
  curso = this.cursos[0] ?? '';
  orientador = '';
  entradaPalavra = '';
  palavras: string[] = [];

  arquivo: File | null = null;
  erroArquivo = '';
  arrastando = false;

  tentouEnviar = false;
  tocados: Record<Campo, boolean> = {
    titulo: false,
    orientador: false,
    palavras: false,
  };

  get modoCorrecao(): boolean {
    return this.idCorrecao !== null;
  }

  /** Com orientadores cadastrados o aluno escolhe da lista; sem eles, digita o nome. */
  get usaListaOrientadores(): boolean {
    return this.orientadores.length > 0;
  }

  ngOnInit() {
    if (!this.idCorrecao || !this.ehNavegador) return;

    const usuario = this.sessao.usuario;
    const envio = usuario ? this.envios.obterDoUsuario(usuario.email, this.idCorrecao) : null;

    // Só dá para corrigir um trabalho seu que foi devolvido para ajustes
    if (!envio || envio.status !== 'Ajustes solicitados') {
      this.router.navigate(['/painel']);
      return;
    }

    this.titulo = envio.titulo;
    this.curso = envio.curso;
    this.orientador = envio.orientador ?? '';
    this.palavras = [...(envio.palavrasChave ?? [])];
    this.motivoAjustes = envio.motivo ?? '';
    this.versaoAtual = envio.versao;
    this.arquivoAnterior = envio.arquivoNome ?? '';

    // Mantém na lista o curso e o orientador que o trabalho já tinha,
    // mesmo que a coordenação tenha mudado o cadastro depois.
    if (!this.cursos.includes(this.curso)) {
      this.cursos = [...this.cursos, this.curso];
    }
    if (
      this.usaListaOrientadores &&
      this.orientador &&
      !this.orientadores.includes(this.orientador)
    ) {
      this.orientadores = [...this.orientadores, this.orientador];
    }
  }

  // ---------- Regras ----------
  get tituloValido(): boolean {
    return this.titulo.trim().length >= 5;
  }

  get orientadorValido(): boolean {
    return this.orientador.trim().length >= 3;
  }

  get palavrasValidas(): boolean {
    return this.palavras.length >= 1;
  }

  get formularioValido(): boolean {
    return (
      !!this.arquivo && this.tituloValido && this.orientadorValido && this.palavrasValidas
    );
  }

  // ---------- Mensagens ----------
  get erroTitulo(): string {
    if (!this.deveMostrar('titulo')) return '';
    return this.tituloValido ? '' : 'Informe o título do trabalho.';
  }

  get erroOrientador(): string {
    if (!this.deveMostrar('orientador') || this.orientadorValido) return '';
    return this.usaListaOrientadores
      ? 'Selecione o orientador(a).'
      : 'Informe o nome do orientador(a).';
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

    // Provisório: guarda só os dados do envio (nome e tamanho do PDF).
    // O arquivo em si será enviado ao backend na Parte 2.
    if (this.idCorrecao) {
      const reenviado = this.envios.reenviar(
        usuario.email,
        this.idCorrecao,
        {
          titulo: this.titulo.trim(),
          curso: this.curso,
          orientador: this.orientador.trim(),
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
          `${reenviado.titulo} · versão ${reenviado.versao}`,
        );
      }
      this.router.navigate(['/painel']);
      return;
    }

    const titulo = this.titulo.trim();
    this.envios.adicionar(usuario.email, {
      titulo,
      autor: usuario.nome,
      curso: this.curso,
      orientador: this.orientador.trim(),
      palavrasChave: [...this.palavras],
      arquivoNome: this.arquivo.name,
      arquivoTamanho: this.arquivo.size,
      enviadoEm: new Date().toISOString(),
      status: 'Em análise',
    });
    this.atividades.registrar(usuario.nome, 'Trabalho enviado', titulo);

    this.router.navigate(['/painel']);
  }
}