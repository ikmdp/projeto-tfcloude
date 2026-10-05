import { PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { Sessao } from './sessao';

/** Telas do aluno: exige login, e manda o admin para a área dele. */
export const alunoGuard: CanActivateFn = () => {
  const ehNavegador = isPlatformBrowser(inject(PLATFORM_ID));
  const sessao = inject(Sessao);
  const router = inject(Router);

  // No servidor não existe sessão: quem decide é o navegador.
  if (!ehNavegador) return true;

  const usuario = sessao.usuario;
  if (!usuario) return router.createUrlTree(['/login']);
  if (usuario.papel === 'admin') return router.createUrlTree(['/admin']);
  return true;
};

/** Telas da coordenação: só admin entra. */
export const adminGuard: CanActivateFn = () => {
  const ehNavegador = isPlatformBrowser(inject(PLATFORM_ID));
  const sessao = inject(Sessao);
  const router = inject(Router);

  if (!ehNavegador) return true;

  const usuario = sessao.usuario;
  if (!usuario) return router.createUrlTree(['/login']);
  if (usuario.papel !== 'admin') return router.createUrlTree(['/painel']);
  return true;
};