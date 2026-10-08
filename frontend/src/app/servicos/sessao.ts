import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { EMAIL_ADMIN, Professores } from './professores';

export type Papel = 'aluno' | 'professor' | 'admin';

export interface UsuarioLogado {
  nome: string;
  email: string;
  papel: Papel;
}

const CHAVE_SESSAO = 'tfcloud_sessao';
const CHAVE_NOMES = 'tfcloud_nomes';

/** Tela inicial de cada perfil. */
export function rotaInicial(papel: Papel): string {
  if (papel === 'admin') return '/admin';
  if (papel === 'professor') return '/painel';
  return '/aluno';
}

@Injectable({ providedIn: 'root' })
export class Sessao {
  private ehNavegador = isPlatformBrowser(inject(PLATFORM_ID));
  private professores = inject(Professores);

  /** Quem está logado agora (ou null). O perfil é conferido a cada leitura. */
  get usuario(): UsuarioLogado | null {
    if (!this.ehNavegador) return null;
    try {
      const texto = localStorage.getItem(CHAVE_SESSAO) ?? sessionStorage.getItem(CHAVE_SESSAO);
      if (!texto) return null;
      const salvo = JSON.parse(texto) as UsuarioLogado;
      return { ...salvo, papel: this.papelDoEmail(salvo.email) };
    } catch {
      return null;
    }
  }

  get ehAdmin(): boolean {
    return this.usuario?.papel === 'admin';
  }

  get ehProfessor(): boolean {
    return this.usuario?.papel === 'professor';
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
      email: email.trim().toLowerCase(),
      nome: this.descobrirNome(email),
      papel: this.papelDoEmail(email),
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

  // Provisório: no backend, o perfil virá do banco de dados.
  private papelDoEmail(email: string): Papel {
    const chave = email.trim().toLowerCase();
    if (chave === EMAIL_ADMIN) return 'admin';
    return this.professores.existe(chave) ? 'professor' : 'aluno';
  }

  private descobrirNome(email: string): string {
    const chave = email.trim().toLowerCase();

    if (chave === EMAIL_ADMIN) return 'Coordenação';

    const professor = this.professores.obter(chave);
    if (professor) return professor.nome;

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