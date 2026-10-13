import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Envio } from '../envios/envio.entity.js';
import { Curso } from './curso.entity.js';

const CURSOS_INICIAIS = ['Eletrotécnica', 'Informática', 'Logística', 'Mecânica'];

/** Tira acentos e maiúsculas para comparar "Logística" com "logistica". */
function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

const ordemAlfabetica = (a: { nome: string }, b: { nome: string }) =>
  a.nome.localeCompare(b.nome, 'pt-BR');

@Injectable()
export class CursosService implements OnModuleInit {
  constructor(
    @InjectRepository(Curso) private readonly repo: Repository<Curso>,
    @InjectRepository(Envio) private readonly envios: Repository<Envio>,
  ) {}

  /** Na primeira vez, cria os cursos iniciais. */
  async onModuleInit() {
    if ((await this.repo.count()) > 0) return;
    await this.repo.save(CURSOS_INICIAIS.map((nome) => this.repo.create({ nome })));
  }

  /** Lista pública: só o que o cadastro e os filtros precisam. */
  async listar() {
    const cursos = await this.repo.find();
    return cursos.sort(ordemAlfabetica).map((c) => ({ id: c.id, nome: c.nome }));
  }

  /** Para a coordenação: com a quantidade de trabalhos de cada curso. */
  async uso() {
    const cursos = await this.repo.find();
    const contagens = await this.envios
      .createQueryBuilder('e')
      .select('e.curso', 'curso')
      .addSelect('COUNT(*)', 'total')
      .groupBy('e.curso')
      .getRawMany<{ curso: string; total: string | number }>();

    const porCurso = new Map(contagens.map((c) => [c.curso, Number(c.total)]));
    return cursos
      .sort(ordemAlfabetica)
      .map((c) => ({ id: c.id, nome: c.nome, trabalhos: porCurso.get(c.nome) ?? 0 }));
  }

  async adicionar(nome: string) {
    const existentes = await this.repo.find();
    if (existentes.some((c) => normalizar(c.nome) === normalizar(nome))) {
      throw new ConflictException('Este curso já está cadastrado.');
    }

    try {
      const curso = await this.repo.save(this.repo.create({ nome }));
      return { id: curso.id, nome: curso.nome, trabalhos: 0 };
    } catch (erro) {
      // Dois cadastros ao mesmo tempo com o mesmo nome
      const codigo = String((erro as { code?: string }).code ?? '');
      if (codigo.startsWith('SQLITE_CONSTRAINT')) {
        throw new ConflictException('Este curso já está cadastrado.');
      }
      throw erro;
    }
  }

  /** Devolve o nome do curso removido (para o registro de atividades). */
  async remover(id: string): Promise<string> {
    const curso = await this.repo.findOne({ where: { id } });
    if (!curso) throw new NotFoundException('Curso não encontrado.');

    const usados = await this.envios.count({ where: { curso: curso.nome } });
    if (usados > 0) {
      throw new ConflictException(
        `Há ${usados} ${usados === 1 ? 'trabalho' : 'trabalhos'} neste curso e ele não pode ser removido.`,
      );
    }

    await this.repo.delete(id);
    return curso.nome;
  }

  /**
   * Confere que o curso existe e devolve o nome como está cadastrado.
   * Um trabalho que já tem este curso pode mantê-lo (passe o curso atual em "atual").
   */
  async resolver(nome: string, atual?: string): Promise<string> {
    if (atual && nome === atual) return atual;

    const alvo = normalizar(nome);
    const todos = await this.repo.find();
    const achado = todos.find((c) => normalizar(c.nome) === alvo);
    if (!achado) throw new BadRequestException('Selecione um curso cadastrado.');
    return achado.nome;
  }
}