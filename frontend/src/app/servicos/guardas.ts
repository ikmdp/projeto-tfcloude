import { PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { Papel, Sessao, rotaInicial } from './sessao';

/** Só deixa passar quem tem o perfil indicado. Os demais vão para a própria área. */
function exigir(papel: Papel): CanActivateFn {
  return () => {
    const ehNavegador = isPlatformBrowser(inject(PLATFORM_ID));
    const sessao = inject(Sessao);
    const router = inject(Router);

    // No servidor não existe sessão: quem decide é o navegador.
    if (!ehNavegador) return true;

    const usuario = sessao.usuario;
    if (!usuario) return router.createUrlTree(['/login']);
    if (usuario.papel !== papel) return router.createUrlTree([rotaInicial(usuario.papel)]);
    return true;
  };
}

export const alunoGuard = exigir('aluno');
export const professorGuard = exigir('professor');
export const adminGuard = exigir('admin');