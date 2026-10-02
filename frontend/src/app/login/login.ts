import { Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Sessao } from '../servicos/sessao';
import { Logo } from '../logo/logo';

const CHAVE_EMAIL = 'tfcloud_email_lembrado';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink, Logo],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit {
  private ehNavegador = isPlatformBrowser(inject(PLATFORM_ID));
  private router = inject(Router);
  private sessao = inject(Sessao);

  email = '';
  senha = '';
  lembrar = false;
  mostrarSenha = false;
  erro = '';

  ngOnInit() {
    if (!this.ehNavegador) return;

    try {
      const emailSalvo = localStorage.getItem(CHAVE_EMAIL);
      if (emailSalvo) {
        this.email = emailSalvo;
        this.lembrar = true;
      }
    } catch {
      // Armazenamento bloqueado (ex.: navegação anônima). Segue sem lembrar.
    }
  }

  alternarSenha() {
    this.mostrarSenha = !this.mostrarSenha;
  }

  entrar() {
    if (!this.email.trim() || !this.senha) {
      this.erro = 'Informe seu e-mail e sua senha.';
      return;
    }

    this.erro = '';
    this.salvarOuLimparEmail();

    // Login de mentira: aceita qualquer senha.
    // Na Parte 2 isso vira uma chamada ao backend, que devolve o papel do usuário.
    this.sessao.entrar(this.email, this.lembrar);
    this.router.navigate([this.sessao.ehAdmin ? '/admin' : '/painel']);
  }

  private salvarOuLimparEmail() {
    if (!this.ehNavegador) return;

    try {
      if (this.lembrar) {
        localStorage.setItem(CHAVE_EMAIL, this.email.trim());
      } else {
        localStorage.removeItem(CHAVE_EMAIL);
      }
    } catch {
      // Ignora se o navegador bloquear o armazenamento.
    }
  }
}