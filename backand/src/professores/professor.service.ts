import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailService } from '../email/email.service.js';
import { Usuario } from '../usuarios/usuario.entity.js';
import { UsuariosService } from '../usuarios/usuarios.service.js';
import { CriarProfessorDto } from './dto/criar-professor.dto.js';

const CONVITE_HORAS = 48;

export type Situacao = 'ativo' | 'convite pendente' | 'convite expirado';

export function paraProfessor(u: Usuario) {
  let situacao: Situacao;
  if (u.ativadoEm) situacao = 'ativo';
  else if (u.tokenExpira && u.tokenExpira.getTime() > Date.now()) situacao = 'convite pendente';
  else situacao = 'convite expirado';

  return { id: u.id, nome: u.nome, email: u.email, situacao, cadastradoEm: u.criadoEm };
}

@Injectable()
export class ProfessoresService {
  constructor(
    @InjectRepository(Usuario) private readonly repo: Repository<Usuario>,
    private readonly usuarios: UsuariosService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  async listar() {
    const lista = await this.repo.find({
      where: { papel: 'professor', ativo: true },
      order: { nome: 'ASC' },
    });
    return lista.map(paraProfessor);
  }

  async cadastrar(dto: CriarProfessorDto) {
    const emailAdmin = (this.config.get<string>('ADMIN_EMAIL') ?? 'admin@gmail.com')
      .trim()
      .toLowerCase();
    if (dto.email === emailAdmin) {
      throw new BadRequestException(
        'Este e-mail é da coordenação e não pode ser cadastrado como professor(a).',
      );
    }

    let usuario = await this.usuarios.buscarPorEmail(dto.email);

    if (usuario) {
      if (usuario.papel === 'admin') {
        throw new BadRequestException(
          'Este e-mail é da coordenação e não pode ser cadastrado como professor(a).',
        );
      }
      if (usuario.papel === 'professor' && usuario.ativo) {
        throw new ConflictException('Este e-mail já está cadastrado como professor(a).');
      }

      // Era aluno, ou professor removido. Vira professor e a senha antiga é apagada:
      // quem se cadastrou antes com este e-mail não ganha acesso, só o dono do e-mail
      // consegue criar uma senha nova pelo link.
      const novaVersao = usuario.sessaoVersao + 1;
      await this.repo.update(usuario.id, {
        nome: dto.nome,
        papel: 'professor',
        curso: null,
        senhaHash: null,
        ativadoEm: null,
        ativo: true,
        tokenHash: null,
        tokenExpira: null,
        sessaoVersao: novaVersao,
      });
      Object.assign(usuario, {
        nome: dto.nome,
        papel: 'professor',
        curso: null,
        ativadoEm: null,
        ativo: true,
        tokenExpira: null,
        sessaoVersao: novaVersao,
      });
    } else {
      try {
        usuario = await this.repo.save(
          this.repo.create({
            nome: dto.nome,
            email: dto.email,
            papel: 'professor',
            curso: null,
            senhaHash: null,
            ativo: true,
            ativadoEm: null,
            tokenHash: null,
            tokenExpira: null,
          }),
        );
      } catch (erro) {
        const codigo = String((erro as { code?: string }).code ?? '');
        if (codigo.startsWith('SQLITE_CONSTRAINT')) {
          throw new ConflictException('Este e-mail já está cadastrado.');
        }
        throw erro;
      }
    }

    return this.enviarConvite(usuario);
  }

  async reenviarConvite(id: string) {
    const usuario = await this.repo.findOne({ where: { id, papel: 'professor', ativo: true } });
    if (!usuario) throw new NotFoundException('Professor(a) não encontrado(a).');
    if (usuario.ativadoEm) {
      throw new BadRequestException('Este professor(a) já criou a senha e ativou a conta.');
    }

    return this.enviarConvite(usuario);
  }

  async remover(id: string) {
    const usuario = await this.repo.findOne({ where: { id, papel: 'professor', ativo: true } });
    if (!usuario) throw new NotFoundException('Professor(a) não encontrado(a).');

    // Perde o acesso na hora: as sessões abertas deixam de valer
    await this.repo.update(id, {
      ativo: false,
      tokenHash: null,
      tokenExpira: null,
      sessaoVersao: usuario.sessaoVersao + 1,
    });
  }

  private async enviarConvite(usuario: Usuario) {
    const { token, expira } = await this.usuarios.emitirToken(usuario, CONVITE_HORAS);
    usuario.tokenExpira = expira;

    const enviado = await this.email.enviarConvite(
      usuario.email,
      usuario.nome,
      this.email.link('/ativar-conta', token),
    );

    return {
      professor: paraProfessor(usuario),
      convite: enviado ? ('enviado' as const) : ('nao_enviado' as const),
    };
  }
}