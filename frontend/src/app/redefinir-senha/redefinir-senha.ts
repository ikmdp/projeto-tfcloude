import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Logo } from '../logo/logo';

@Component({
  selector: 'app-redefinir-senha',
  imports: [FormsModule, RouterLink, Logo],
  templateUrl: './redefinir-senha.html',
  styleUrl: './redefinir-senha.css',
})
export class RedefinirSenha {
  private rota = inject(ActivatedRoute);

  token = this.rota.snapshot.queryParamMap.get('token') ?? '';

  senha = '';
  confirmarSenha = '';
  mostrarSenha = false;
  mostrarConfirmar = false;
  tentouEnviar = false;
  concluido = false;

  tocadoSenha = false;
  tocadoConfirmar = false;

  get senhaValida(): boolean {
    return this.senha.length >= 8;
  }

  get senhasIguais(): boolean {
    return this.senha === this.confirmarSenha;
  }

  get erroSenha(): string {
    const mostrar = this.tocadoSenha || this.tentouEnviar;
    return mostrar && !this.senhaValida ? 'A senha precisa ter pelo menos 8 caracteres.' : '';
  }

  get erroConfirmar(): string {
    const mostrar = this.tocadoConfirmar || this.tentouEnviar || this.confirmarSenha.length > 0;
    return mostrar && !this.senhasIguais ? 'As duas senhas precisam ser correspondentes.' : '';
  }

  alternarSenha() {
    this.mostrarSenha = !this.mostrarSenha;
  }

  alternarConfirmar() {
    this.mostrarConfirmar = !this.mostrarConfirmar;
  }

  salvar() {
    this.tentouEnviar = true;
    if (!this.senhaValida || !this.senhasIguais) return;

    console.log('Nova senha definida com o token:', this.token);
    // Na Parte 2 enviamos { token, senha } para o backend

    this.concluido = true;
  }
}