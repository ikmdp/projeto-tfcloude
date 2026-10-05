import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Logo } from '../logo/logo';



@Component({
  selector: 'app-esqueci-senha',
  imports: [FormsModule, RouterLink, Logo],
  templateUrl: './esqueci-senha.html',
  styleUrl: './esqueci-senha.css',
})
export class EsqueciSenha {
  email = '';
  tocado = false;
  enviado = false;

  get emailValido(): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim());
  }

  get erroEmail(): string {
    return this.tocado && !this.emailValido ? 'Digite um e-mail válido.' : '';
  }

  marcar() {
    this.tocado = true;
  }

  enviar() {
    this.tocado = true;
    if (!this.emailValido) return;

    console.log('Pedido de recuperação para:', this.email.trim());
    // Na Parte 2 chamamos o backend aqui

    this.enviado = true;
  }
}