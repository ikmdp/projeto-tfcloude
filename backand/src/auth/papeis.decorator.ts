import { SetMetadata } from '@nestjs/common';
import type { Papel } from '../usuarios/usuario.entity.js';

export const PAPEIS = 'papeis';

/** Restringe uma rota a certos perfis. Ex.: @Papeis('admin') */
export const Papeis = (...papeis: Papel[]) => SetMetadata(PAPEIS, papeis);