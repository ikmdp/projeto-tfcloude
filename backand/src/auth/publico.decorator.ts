import { SetMetadata } from '@nestjs/common';

export const E_PUBLICO = 'ePublico';

/** Marca uma rota que pode ser acessada sem login. */
export const Publico = () => SetMetadata(E_PUBLICO, true);