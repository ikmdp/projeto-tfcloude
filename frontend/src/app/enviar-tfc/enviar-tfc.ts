import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Sessao } from '../servicos/sessao';
import { Envios } from '../servicos/envios';

type Campo = 'titulo' | 'orientador' | 'palavras';

const TAMANHO_MAXIMO = 25 * 1024 * 1024; // 25 MB
const MAX_PALAVRAS = 8;

@Component({
  selector: 'app-enviar-tfc',
  imports: [FormsModule],
  templateUrl: './enviar-tfc.html',
  styleUrl: './enviar-tfc.css',
})
export class EnviarTfc {
  private router = inject(Router);
  private sessao = inject(Sessao);
  private envios = inject(Envios);

  titulo = '';
  curso = 'Eletrotécnica';
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

  cursos = ['Eletrotécnica', 'Informática', 'Mecânica', 'Edificações'];

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
    if (!this.deveMostrar('orientador')) return '';
    return this.orientadorValido ? '' : 'Informe o nome do orientador(a).';
  }

  get erroPalavras(): string {
    if (!this.deveMostrar('palavras')) return '';
    return this.palavrasValidas ? '' : 'Adicione pelo menos uma palavra-chave.';
  }

  get erroArquivoMostrado(): string {
    if (this.erroArquivo) return this.erroArquivo;
    return this.tentouEnviar && !this.arquivo ? 'Anexe o arquivo do trabalho em PDF.' : '';
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
    this.envios.adicionar(usuario.email, {
      titulo: this.titulo.trim(),
      autor: usuario.nome,
      curso: this.curso,
      orientador: this.orientador.trim(),
      palavrasChave: [...this.palavras],
      arquivoNome: this.arquivo.name,
      arquivoTamanho: this.arquivo.size,
      enviadoEm: new Date().toISOString(),
      status: 'Em análise',
    });

    this.router.navigate(['/painel']);
  }
}