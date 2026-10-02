import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type StatusEnvio = 'Em análise' | 'Aprovado';

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

  /** Registra um novo envio (será chamado pela tela "Enviar TFC"). */
  adicionar(email: string, dados: Omit<Envio, 'id'>): Envio {
    const envio: Envio = { ...dados, id: this.novoId() };
    const tudo = this.lerTudo();
    const chave = this.chave(email);
    tudo[chave] = [...(tudo[chave] ?? []), envio];
    this.gravarTudo(tudo);
    return envio;
  }

    /** Trabalhos aprovados de todos os usuários (alimenta o acervo). */
  listarAprovados(): Envio[] {
    return Object.values(this.lerTudo())
      .flat()
      .filter((e) => e.status === 'Aprovado');
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