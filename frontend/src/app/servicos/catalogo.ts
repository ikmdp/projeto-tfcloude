import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Envios } from './envios';

interface Dados {
  cursos: string[];
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

  /** Quantos trabalhos já usam esse curso. */
  trabalhosDoCurso(curso: string): number {
    const alvo = this.normalizar(curso);
    return this.envios.listarTodos().filter((e) => this.normalizar(e.curso) === alvo).length;
  }

  /** Devolve a mensagem de erro, ou texto vazio se deu certo. */
  adicionarCurso(nome: string): string {
    const dados = this.ler();
    const limpo = nome.trim().replace(/\s+/g, ' ');

    if (limpo.length < 2) return 'Informe o nome do curso (mínimo de 2 letras).';
    if (limpo.length > 60) return 'O nome pode ter no máximo 60 caracteres.';

    const repetido = dados.cursos.some((c) => this.normalizar(c) === this.normalizar(limpo));
    if (repetido) return 'Este curso já está cadastrado.';

    dados.cursos = [...dados.cursos, limpo].sort((a, b) => a.localeCompare(b, 'pt-BR'));
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

  // ---------- Internos ----------

  /** Tira acentos e maiúsculas para comparar "Logística" com "logistica". */
  private normalizar(texto: string): string {
    return texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private ler(): Dados {
    const padrao: Dados = { cursos: [...CURSOS_INICIAIS] };
    if (!this.ehNavegador) return padrao;

    try {
      const bruto = localStorage.getItem(CHAVE_CATALOGO);
      if (!bruto) return padrao;
      const salvo = JSON.parse(bruto) as Partial<Dados>;
      return { cursos: salvo.cursos ?? padrao.cursos };
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