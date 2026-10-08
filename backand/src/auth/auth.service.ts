import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcryptjs from 'bcryptjs';
import { Repository } from 'typeorm';
import { EmailService } from '../email/email.service.js';
import { hashToken } from '../usuarios/tokens.js';
import { Usuario } from '../usuarios/usuario.entity.js';
import { UsuariosService } from '../usuarios/usuarios.service.js';
import { CadastroDto } from './dto/cadastro.dto.js';
import { DefinirSenhaDto } from './dto/definir-senha.dto.js';
import { EsqueciSenhaDto } from './dto/esqueci-senha.dto.js';
import { LoginDto } from './dto/login.dto.js';

// Funciona tanto em módulo ES quanto em CommonJS
const bcrypt: typeof bcryptjs = (bcryptjs as any).default ?? bcryptjs;

// Usado quando o e-mail não existe, para gastar o mesmo tempo de uma senha de verdade
const HASH_FALSO = bcrypt.hashSync('senha-falsa-so-para-igualar-o-tempo', 12);

const OITO_HORAS = 60 * 60 * 8;
const TRINTA_DIAS = 60 * 60 * 24 * 30;
const RECUPERACAO_HORAS = 1;

/** Dados do usuário que podem ir para o front-end (nunca a senha). */
export function paraResposta(u: Usuario) {
  return { id: u.id, nome: u.nome, email: u.email, papel: u.papel, curso: u.curso };
}

@Injectable()
export class AuthService {
  private readonly log = new Logger(AuthService.name);

  constructor(
    @InjectRepository(Usuario) private readonly repo: Repository<Usuario>,
    private readonly usuarios: UsuariosService,
    private readonly email: EmailService,
    private readonly jwt: JwtService,
  ) {}

  /** Cadastro aberto: sempre cria um aluno. */
  async cadastrar(dto: CadastroDto) {
    const jaExiste = (await this.repo.count({ where: { email: dto.email } })) > 0;
    if (jaExiste) throw new ConflictException('Este e-mail já está cadastrado.');

    const usuario = this.repo.create({
      nome: dto.nome,
      email: dto.email,
      papel: 'aluno',
      curso: dto.curso ?? null,
      senhaHash: await bcrypt.hash(dto.senha, 12),
      ativo: true,
      ativadoEm: new Date(),
    });

    try {
      await this.repo.save(usuario);
    } catch (erro) {
      // Dois cadastros ao mesmo tempo com o mesmo e-mail
      const codigo = String((erro as { code?: string }).code ?? '');
      if (codigo.startsWith('SQLITE_CONSTRAINT')) {
        throw new ConflictException('Este e-mail já está cadastrado.');
      }
      throw erro;
    }

    return this.criarSessao(usuario, false);
  }

  async entrar(dto: LoginDto) {
    // A senha não vem nas consultas comuns, então pedimos ela de forma explícita
    const usuario = await this.repo
      .createQueryBuilder('u')
      .addSelect('u.senhaHash')
      .where('u.email = :email', { email: dto.email })
      .getOne();

    const confere = await bcrypt.compare(dto.senha, usuario?.senhaHash ?? HASH_FALSO);

    // Mesma mensagem para qualquer falha: não revela se o e-mail existe
    if (!usuario || !usuario.senhaHash || !usuario.ativo || !confere) {
      throw new UnauthorizedException('E-mail ou senha incorretos.');
    }

    return this.criarSessao(usuario, dto.lembrar === true);
  }

  /**
   * Responde sempre a mesma coisa, exista o e-mail ou não.
   * O envio acontece em segundo plano, para o tempo de resposta não revelar quem tem conta.
   */
  esqueciSenha(dto: EsqueciSenhaDto) {
    void this.enviarRecuperacao(dto.email);
    return {
      mensagem: 'Se o e-mail estiver cadastrado, enviaremos um link para criar uma nova senha.',
    };
  }

  /** Vale para o primeiro acesso do professor e para a recuperação de senha. */
  async definirSenha(dto: DefinirSenhaDto) {
    const hash = hashToken(dto.token);
    const usuario = await this.repo.findOne({ where: { tokenHash: hash } });

    const valido =
      usuario && usuario.ativo && usuario.tokenExpira && usuario.tokenExpira.getTime() > Date.now();
    if (!usuario || !valido) {
      throw new BadRequestException('Este link é inválido ou expirou. Peça um novo link.');
    }

    const novaVersao = usuario.sessaoVersao + 1;
    const senhaHash = await bcrypt.hash(dto.senha, 12);

    // Só grava se o link ainda for o mesmo: dois usos ao mesmo tempo, só um passa
    const resultado = await this.repo.update(
      { id: usuario.id, tokenHash: hash },
      {
        senhaHash,
        tokenHash: null,
        tokenExpira: null,
        ativadoEm: usuario.ativadoEm ?? new Date(),
        sessaoVersao: novaVersao,
      },
    );
    if (resultado.affected !== 1) {
      throw new BadRequestException('Este link é inválido ou expirou. Peça um novo link.');
    }

    usuario.sessaoVersao = novaVersao;
    return this.criarSessao(usuario, false);
  }

  private async enviarRecuperacao(email: string) {
    try {
      const usuario = await this.usuarios.buscarPorEmail(email);
      if (!usuario || !usuario.ativo) return;

      const { token } = await this.usuarios.emitirToken(usuario, RECUPERACAO_HORAS);
      await this.email.enviarRecuperacao(
        usuario.email,
        usuario.nome,
        this.email.link('/redefinir-senha', token),
      );
    } catch (erro) {
      this.log.error(`Falha na recuperação de senha: ${(erro as Error).message}`);
    }
  }

  private async criarSessao(usuario: Usuario, lembrar: boolean) {
    const token = await this.jwt.signAsync(
      { sub: usuario.id, v: usuario.sessaoVersao },
      { expiresIn: lembrar ? TRINTA_DIAS : OITO_HORAS },
    );
    return { token, usuario: paraResposta(usuario) };
  }
}