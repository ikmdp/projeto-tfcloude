import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export const EMAIL_ADMIN = 'admin@gmail.com';

export interface Professor {
  nome: string;
  email: string;
  cadastradoEm: string; // data em formato ISO
}

const CHAVE_PROFESSORES = 'tfcloud_professores';

@Injectable({ providedIn: 'root' })
export class Professores {
  private ehNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  /** Em ordem alfabética. */
  listar(): Professor[] {
    return [...this.ler()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }

  existe(email: string): boolean {
    return this.obter(email) !== null;
  }

  obter(email: string): Professor | null {
    const chave = this.normalizar(email);
    return this.ler().find((p) => p.email === chave) ?? null;
  }

  /** Devolve a mensagem de erro, ou texto vazio se deu certo. */
  adicionar(nome: string, email: string): string {
    const nomeLimpo = nome.trim().replace(/\s+/g, ' ');
    const emailLimpo = this.normalizar(email);

    if (nomeLimpo.length < 3) return 'Informe o nome do professor(a) (mínimo de 3 letras).';
    if (nomeLimpo.length > 60) return 'O nome pode ter no máximo 60 caracteres.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpo)) return 'Digite um e-mail válido.';
    if (emailLimpo === EMAIL_ADMIN) {
      return 'Este e-mail é da coordenação e não pode ser cadastrado como professor.';
    }
    if (this.existe(emailLimpo)) return 'Este e-mail já está cadastrado.';

    const lista = this.ler();
    lista.push({ nome: nomeLimpo, email: emailLimpo, cadastradoEm: new Date().toISOString() });
    this.gravar(lista);
    return '';
  }

  remover(email: string) {
    const chave = this.normalizar(email);
    this.gravar(this.ler().filter((p) => p.email !== chave));
  }

  private normalizar(email: string): string {
    return email.trim().toLowerCase();
  }

  private ler(): Professor[] {
    if (!this.ehNavegador) return [];
    try {
      return JSON.parse(localStorage.getItem(CHAVE_PROFESSORES) ?? '[]') as Professor[];
    } catch {
      return [];
    }
  }

  private gravar(lista: Professor[]) {
    if (!this.ehNavegador) return;
    try {
      localStorage.setItem(CHAVE_PROFESSORES, JSON.stringify(lista));
    } catch {
      // Armazenamento bloqueado ou cheio: ignora.
    }
  }
}