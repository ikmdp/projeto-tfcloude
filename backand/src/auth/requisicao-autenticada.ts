import type { Request } from 'express';
import type { Usuario } from '../usuarios/usuario.entity.js';

/** Requisição depois que o guarda de login confirmou quem é o usuário. */
export interface RequisicaoAutenticada extends Request {
  usuario?: Usuario;
}