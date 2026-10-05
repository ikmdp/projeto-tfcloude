import { TipoEvento } from './envios';

const ROTULOS: Record<TipoEvento, string> = {
  enviado: 'Enviado',
  reenviado: 'Reenviado com correções',
  ajustes: 'Ajustes solicitados',
  aprovado: 'Aprovado',
  reprovado: 'Reprovado',
  editado: 'Dados editados',
  removido: 'Removido do acervo',
  restaurado: 'Restaurado ao acervo',
};

export function rotuloEvento(tipo: TipoEvento): string {
  return ROTULOS[tipo];
}

/** "agora", "há 4 horas", "há 2 dias" ou a data, se for antiga. */
export function descreverQuando(iso: string): string {
  const minutos = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutos < 1) return 'agora';
  if (minutos < 60) return `há ${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}`;

  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas} ${horas === 1 ? 'hora' : 'horas'}`;

  const dias = Math.floor(horas / 24);
  if (dias <= 30) return `há ${dias} ${dias === 1 ? 'dia' : 'dias'}`;

  return `em ${new Date(iso).toLocaleDateString('pt-BR')}`;
}

export function formatarDataHora(iso: string): string {
  const data = new Date(iso);
  const dia = data.toLocaleDateString('pt-BR');
  const hora = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${dia} ${hora}`;
}