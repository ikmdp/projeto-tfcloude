import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export interface Atividade {
  id: string;
  em: string; // data em formato ISO
  por: string;
  acao: string;
  detalhe: string;
}

const CHAVE_ATIVIDADES = 'tfcloud_atividades';
const LIMITE = 500;

@Injectable({ providedIn: 'root' })
export class Atividades {
  private ehNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  /** Anota quem fez o quê. Guarda as últimas 500 ações. */
  registrar(por: string, acao: string, detalhe: string) {
    if (!this.ehNavegador) return;

    const lista = this.lerTudo();
    lista.unshift({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      em: new Date().toISOString(),
      por,
      acao,
      detalhe,
    });
    this.gravar(lista.slice(0, LIMITE));
  }

  /** Da mais nova para a mais antiga. */
  listar(): Atividade[] {
    return this.lerTudo();
  }

  private lerTudo(): Atividade[] {
    if (!this.ehNavegador) return [];
    try {
      return JSON.parse(localStorage.getItem(CHAVE_ATIVIDADES) ?? '[]');
    } catch {
      return [];
    }
  }

  private gravar(lista: Atividade[]) {
    try {
      localStorage.setItem(CHAVE_ATIVIDADES, JSON.stringify(lista));
    } catch {
      // Armazenamento bloqueado ou cheio: ignora.
    }
  }
}