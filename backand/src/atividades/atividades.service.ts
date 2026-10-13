import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { Atividade } from './atividade.entity.js';
import { ConsultaAtividadesDto } from './dto/consulta-atividades.dto.js';

const LIMITE = 5000; // quantas ações ficam guardadas
const FOLGA = 200; // só limpa quando passa do limite por esta folga

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

@Injectable()
export class AtividadesService {
  private readonly log = new Logger(AtividadesService.name);

  constructor(@InjectRepository(Atividade) private readonly repo: Repository<Atividade>) {}

  /** Anota quem fez o quê. Nunca derruba a ação principal se der problema. */
  async registrar(por: string, acao: string, detalhe: string): Promise<void> {
    try {
      await this.repo.save(
        this.repo.create({
          por: por.slice(0, 80),
          acao: acao.slice(0, 60),
          detalhe: detalhe.slice(0, 500),
        }),
      );
      await this.limparAntigas();
    } catch (erro) {
      this.log.error(`Falha ao registrar atividade "${acao}": ${(erro as Error).message}`);
    }
  }

  async listar(consulta: ConsultaAtividadesDto) {
    const todas = await this.repo.find({
      where: consulta.acao ? { acao: consulta.acao } : {},
      order: { id: 'DESC' },
    });

    const termo = normalizar(consulta.q ?? '');
    const filtradas = termo
      ? todas.filter((a) => normalizar(`${a.por} ${a.acao} ${a.detalhe}`).includes(termo))
      : todas;

    const limite = consulta.limite ?? 30;
    const pagina = consulta.pagina ?? 1;
    const itens = filtradas
      .slice((pagina - 1) * limite, pagina * limite)
      .map((a) => ({ id: a.id, em: a.em, por: a.por, acao: a.acao, detalhe: a.detalhe }));

    const distintas = await this.repo
      .createQueryBuilder('a')
      .select('DISTINCT a.acao', 'acao')
      .getRawMany<{ acao: string }>();
    const acoes = distintas.map((d) => d.acao).sort((a, b) => a.localeCompare(b, 'pt-BR'));

    return { total: filtradas.length, pagina, limite, itens, acoes };
  }

  private async limparAntigas() {
    if ((await this.repo.count()) <= LIMITE + FOLGA) return;

    const corte = await this.repo.find({ order: { id: 'DESC' }, skip: LIMITE, take: 1 });
    if (corte[0]) await this.repo.delete({ id: LessThan(corte[0].id) });
  }
}