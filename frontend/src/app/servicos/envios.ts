import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type StatusEnvio = 'Em análise' | 'Aprovado' | 'Reprovado';

export interface Envio {
  id: string;
  titulo: string;
  autor: string;
  curso: string;
  enviadoEm: string; // data em formato ISO
  status: StatusEnvio;
  orientador?: string;
  palavrasChave?: string[];
  arquivoNome?: string;
  arquivoTamanho?: number;
}

const CHAVE_ENVIOS = 'tfcloud_envios';

@Injectable({ providedIn: 'root' })
export class Envios {
  private ehNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  /** Todos os envios de um usuário, do mais novo para o mais antigo. */
  listar(email: string): Envio[] {
    const lista = this.lerTudo()[this.chave(email)] ?? [];
    return [...lista].sort(
      (a, b) => new Date(b.enviadoEm).getTime() - new Date(a.enviadoEm).getTime(),
    );
  }

  /** Trabalhos aprovados de todos os usuários (alimenta o acervo). */
  listarAprovados(): Envio[] {
    return Object.values(this.lerTudo())
      .flat()
      .filter((e) => e.status === 'Aprovado');
  }

  /** Fila da coordenação: envios em análise de todos os usuários, do mais antigo ao mais novo. */
  listarEmAnalise(): Envio[] {
    return Object.values(this.lerTudo())
      .flat()
      .filter((e) => e.status === 'Em análise')
      .sort((a, b) => new Date(a.enviadoEm).getTime() - new Date(b.enviadoEm).getTime());
  }

  /** Registra um novo envio. */
  adicionar(email: string, dados: Omit<Envio, 'id'>): Envio {
    const envio: Envio = { ...dados, id: this.novoId() };
    const tudo = this.lerTudo();
    const chave = this.chave(email);
    tudo[chave] = [...(tudo[chave] ?? []), envio];
    this.gravarTudo(tudo);
    return envio;
  }

  /** Muda o status de um envio, de qualquer usuário. Devolve false se não achar. */
  alterarStatus(id: string, status: StatusEnvio): boolean {
    const tudo = this.lerTudo();
    for (const lista of Object.values(tudo)) {
      const envio = lista.find((e) => e.id === id);
      if (envio) {
        envio.status = status;
        this.gravarTudo(tudo);
        return true;
      }
    }
    return false;
  }

  /** Apaga todos os envios de um usuário (usado só nos testes). */
  limpar(email: string) {
    const tudo = this.lerTudo();
    delete tudo[this.chave(email)];
    this.gravarTudo(tudo);
  }

  private chave(email: string): string {
    return email.trim().toLowerCase();
  }

  private novoId(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  private lerTudo(): Record<string, Envio[]> {
    if (!this.ehNavegador) return {};
    try {
      return JSON.parse(localStorage.getItem(CHAVE_ENVIOS) ?? '{}');
    } catch {
      return {};
    }
  }

  private gravarTudo(tudo: Record<string, Envio[]>) {
    if (!this.ehNavegador) return;
    try {
      localStorage.setItem(CHAVE_ENVIOS, JSON.stringify(tudo));
    } catch {
      // Armazenamento bloqueado ou cheio: ignora.
    }
  }
}