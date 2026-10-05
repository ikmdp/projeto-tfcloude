import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Envios } from './envios';

interface Dados {
  cursos: string[];
  orientadores: string[];
}

const CHAVE_CATALOGO = 'tfcloud_catalogo';
const CURSOS_INICIAIS = ['Eletrotécnica', 'Informática', 'Logística', 'Mecânica'];

@Injectable({ providedIn: 'root' })
export class Catalogo {
  private ehNavegador = isPlatformBrowser(inject(PLATFORM_ID));
  private envios = inject(Envios);

  listarCursos(): string[] {
    return [...this.ler().cursos];
  }

  listarOrientadores(): string[] {
    return [...this.ler().orientadores];
  }

  /** Quantos trabalhos já usam esse curso. */
  trabalhosDoCurso(curso: string): number {
    const alvo = this.normalizar(curso);
    return this.envios.listarTodos().filter((e) => this.normalizar(e.curso) === alvo).length;
  }

  /** Devolve a mensagem de erro, ou texto vazio se deu certo. */
  adicionarCurso(nome: string): string {
    const dados = this.ler();
    const limpo = this.limpar(nome);
    const erro = this.validar(limpo, dados.cursos, 2, 'curso');
    if (erro) return erro;

    dados.cursos = this.ordenar([...dados.cursos, limpo]);
    this.gravar(dados);
    return '';
  }

  removerCurso(nome: string): string {
    const usados = this.trabalhosDoCurso(nome);
    if (usados > 0) {
      return `Há ${usados} ${usados === 1 ? 'trabalho' : 'trabalhos'} neste curso e ele não pode ser removido.`;
    }

    const dados = this.ler();
    dados.cursos = dados.cursos.filter((c) => c !== nome);
    this.gravar(dados);
    return '';
  }

  adicionarOrientador(nome: string): string {
    const dados = this.ler();
    const limpo = this.limpar(nome);
    const erro = this.validar(limpo, dados.orientadores, 3, 'orientador(a)');
    if (erro) return erro;

    dados.orientadores = this.ordenar([...dados.orientadores, limpo]);
    this.gravar(dados);
    return '';
  }

  /** Trabalhos antigos mantêm o nome do orientador que já tinham. */
  removerOrientador(nome: string) {
    const dados = this.ler();
    dados.orientadores = dados.orientadores.filter((o) => o !== nome);
    this.gravar(dados);
  }

  // ---------- Internos ----------

  private validar(nome: string, existentes: string[], minimo: number, rotulo: string): string {
    if (nome.length < minimo) return `Informe o nome do ${rotulo} (mínimo de ${minimo} letras).`;
    if (nome.length > 60) return 'O nome pode ter no máximo 60 caracteres.';

    const repetido = existentes.some((e) => this.normalizar(e) === this.normalizar(nome));
    if (repetido) return `Este ${rotulo} já está cadastrado.`;
    return '';
  }

  private limpar(texto: string): string {
    return texto.trim().replace(/\s+/g, ' ');
  }

  /** Tira acentos e maiúsculas para comparar "Logística" com "logistica". */
  private normalizar(texto: string): string {
    return texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private ordenar(lista: string[]): string[] {
    return [...lista].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }

  private ler(): Dados {
    const padrao: Dados = { cursos: [...CURSOS_INICIAIS], orientadores: [] };
    if (!this.ehNavegador) return padrao;

    try {
      const bruto = localStorage.getItem(CHAVE_CATALOGO);
      if (!bruto) return padrao;
      const salvo = JSON.parse(bruto) as Partial<Dados>;
      return {
        cursos: salvo.cursos ?? padrao.cursos,
        orientadores: salvo.orientadores ?? [],
      };
    } catch {
      return padrao;
    }
  }

  private gravar(dados: Dados) {
    if (!this.ehNavegador) return;
    try {
      localStorage.setItem(CHAVE_CATALOGO, JSON.stringify(dados));
    } catch {
      // Armazenamento bloqueado ou cheio: ignora.
    }
  }
}