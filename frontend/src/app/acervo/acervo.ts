import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AcervoDados, Trabalho } from '../servicos/acervo-dados';
import { Catalogo } from '../servicos/catalogo';

@Component({
  selector: 'app-acervo',
  imports: [FormsModule],
  templateUrl: './acervo.html',
  styleUrl: './acervo.css',
})
export class Acervo implements OnInit {
  private dados = inject(AcervoDados);
  private catalogo = inject(Catalogo);

  opcoes = ['Todos', ...this.catalogo.listarCursos()];
  cursoAtual = 'Todos';

  consulta = ''; // o que está digitado no campo
  termo = ''; // o que foi realmente buscado

  todos: Trabalho[] = [];
  resultados: Trabalho[] = [];

  ngOnInit() {
    this.todos = this.dados.listar();
    this.filtrar();
  }

  buscar() {
    this.termo = this.consulta;
    this.filtrar();
  }

  /** Apagou o texto: a lista volta ao normal sem precisar clicar em Buscar. */
  aoDigitar() {
    if (!this.consulta.trim() && this.termo) {
      this.termo = '';
      this.filtrar();
    }
  }

  escolherCurso(curso: string) {
    this.cursoAtual = curso;
    this.filtrar();
  }

  limpar() {
    this.consulta = '';
    this.termo = '';
    this.cursoAtual = 'Todos';
    this.filtrar();
  }

  formatarTamanho(bytes?: number): string {
    if (!bytes) return 'PDF';
    if (bytes < 1024 * 1024) {
      return `PDF · ${Math.max(1, Math.round(bytes / 1024))} KB`;
    }
    return `PDF · ${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
  }

  private filtrar() {
    const palavras = this.normalizar(this.termo).split(/\s+/).filter(Boolean);

    this.resultados = this.todos.filter((t) => {
      if (this.cursoAtual !== 'Todos' && t.curso !== this.cursoAtual) return false;
      if (!palavras.length) return true;

      const texto = this.normalizar(
        [t.titulo, t.autor, t.curso, String(t.ano), ...t.palavrasChave].join(' '),
      );
      return palavras.every((p) => texto.includes(p));
    });
  }

  /** Tira acentos e maiúsculas: "Energía" e "energia" contam como iguais. */
  private normalizar(texto: string): string {
    return texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }
}