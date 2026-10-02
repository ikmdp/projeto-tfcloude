import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export interface UsuarioLogado {
  nome: string;
  email: string;
}

const CHAVE_SESSAO = 'tfcloud_sessao';
const CHAVE_NOMES = 'tfcloud_nomes';

@Injectable({ providedIn: 'root' })
export class Sessao {
  private ehNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  /** Quem está logado agora (ou null). */
  get usuario(): UsuarioLogado | null {
    if (!this.ehNavegador) return null;
    try {
      const texto = localStorage.getItem(CHAVE_SESSAO) ?? sessionStorage.getItem(CHAVE_SESSAO);
      return texto ? (JSON.parse(texto) as UsuarioLogado) : null;
    } catch {
      return null;
    }
  }

  /** Só o primeiro nome, para a saudação. */
  get primeiroNome(): string {
    const nome = this.usuario?.nome.trim() ?? '';
    return nome.split(/\s+/)[0] ?? '';
  }

  /** Chamado pelo cadastro: lembra o nome completo desse e-mail. */
  registrarNome(email: string, nome: string) {
    if (!this.ehNavegador) return;
    try {
      const nomes = this.lerNomes();
      nomes[email.trim().toLowerCase()] = nome.trim();
      localStorage.setItem(CHAVE_NOMES, JSON.stringify(nomes));
    } catch {
      // Armazenamento bloqueado: segue sem lembrar o nome.
    }
  }

  /** Chamado pelo login. "lembrar" decide se a sessão sobrevive ao fechar o navegador. */
  entrar(email: string, lembrar: boolean) {
    if (!this.ehNavegador) return;
    const usuario: UsuarioLogado = {
      email: email.trim(),
      nome: this.descobrirNome(email),
    };
    try {
      this.sair();
      const armazem = lembrar ? localStorage : sessionStorage;
      armazem.setItem(CHAVE_SESSAO, JSON.stringify(usuario));
    } catch {
      // Armazenamento bloqueado: o login não fica salvo.
    }
  }

  sair() {
    if (!this.ehNavegador) return;
    try {
      localStorage.removeItem(CHAVE_SESSAO);
      sessionStorage.removeItem(CHAVE_SESSAO);
    } catch {
      // Ignora.
    }
  }

  private descobrirNome(email: string): string {
    const chave = email.trim().toLowerCase();
    const salvo = this.lerNomes()[chave];
    if (salvo) return salvo;

    const parte = chave.split('@')[0].split(/[._-]/)[0];
    return parte ? parte.charAt(0).toUpperCase() + parte.slice(1) : 'Usuário';
  }

  private lerNomes(): Record<string, string> {
    try {
      return JSON.parse(localStorage.getItem(CHAVE_NOMES) ?? '{}');
    } catch {
      return {};
    }
  }
}