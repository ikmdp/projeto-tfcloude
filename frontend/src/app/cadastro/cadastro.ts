import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Sessao } from '../servicos/sessao';
import { Logo } from '../logo/logo';

type Campo = 'nome' | 'email' | 'senha' | 'confirmar';

@Component({
  selector: 'app-cadastro',
  imports: [FormsModule, RouterLink, Logo],
  templateUrl: './cadastro.html',
  styleUrl: './cadastro.css',
})
export class Cadastro {
  private sessao = inject(Sessao);

  nome = '';
  email = '';
  curso = 'Eletrotécnica';
  senha = '';
  confirmarSenha = '';

  mostrarSenha = false;
  mostrarConfirmar = false;
  tentouEnviar = false;

  tocados: Record<Campo, boolean> = {
    nome: false,
    email: false,
    senha: false,
    confirmar: false,
  };

  cursos = ['Eletrotécnica', 'Informática', 'Mecânica', 'Edificações'];

  // ---------- Regras (verdadeiro = campo correto) ----------
  get nomeValido(): boolean {
    return this.nome.trim().length >= 3;
  }

  get emailValido(): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim());
  }

  get senhaValida(): boolean {
    return this.senha.length >= 8;
  }

  get senhasIguais(): boolean {
    return this.senha === this.confirmarSenha;
  }

  get formularioValido(): boolean {
    return this.nomeValido && this.emailValido && this.senhaValida && this.senhasIguais;
  }

  // ---------- Mensagens (vazio = não mostrar nada) ----------
  get erroNome(): string {
    if (!this.deveMostrar('nome')) return '';
    return this.nomeValido ? '' : 'Informe seu nome completo.';
  }

  get erroEmail(): string {
    if (!this.deveMostrar('email')) return '';
    return this.emailValido ? '' : 'Digite um e-mail válido.';
  }

  get erroSenha(): string {
    if (!this.deveMostrar('senha')) return '';
    return this.senhaValida ? '' : 'A senha precisa ter pelo menos 8 caracteres.';
  }

  get erroConfirmar(): string {
    const jaDigitou = this.confirmarSenha.length > 0;
    if (!this.deveMostrar('confirmar') && !jaDigitou) return '';
    return this.senhasIguais ? '' : 'As duas senhas precisam ser correspondentes.';
  }

  // ---------- Ações ----------
  marcar(campo: Campo) {
    this.tocados[campo] = true;
  }

  private deveMostrar(campo: Campo): boolean {
    return this.tocados[campo] || this.tentouEnviar;
  }

  alternarSenha() {
    this.mostrarSenha = !this.mostrarSenha;
  }

  alternarConfirmar() {
    this.mostrarConfirmar = !this.mostrarConfirmar;
  }

  criarConta() {
    this.tentouEnviar = true;

    if (!this.formularioValido) {
      return;
    }

    // Guarda o nome para o painel mostrar depois do login (provisório, sem backend)
    this.sessao.registrarNome(this.email, this.nome);

    console.log('Cadastro:', this.nome, this.email, this.curso);
    // Na Parte 2 ligamos isso ao backend
  }
}