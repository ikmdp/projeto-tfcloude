import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcryptjs from 'bcryptjs';
import { Repository } from 'typeorm';
import { gerarToken, hashToken } from './tokens.js';
import { Usuario } from './usuario.entity.js';

// Funciona tanto em módulo ES quanto em CommonJS
const bcrypt: typeof bcryptjs = (bcryptjs as any).default ?? bcryptjs;

@Injectable()
export class UsuariosService implements OnModuleInit {
  private readonly log = new Logger(UsuariosService.name);

  constructor(
    @InjectRepository(Usuario) private readonly repo: Repository<Usuario>,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    await this.completarContasAntigas();
    await this.garantirAdmin();
  }

  buscarPorEmail(email: string): Promise<Usuario | null> {
    return this.repo.findOne({ where: { email: email.trim().toLowerCase() } });
  }

  /**
   * Cria um link de uso único para a pessoa definir a senha.
   * Devolve o token (para ir no e-mail). No banco fica só o hash.
   */
  async emitirToken(usuario: Usuario, horas: number): Promise<{ token: string; expira: Date }> {
    const token = gerarToken();
    const expira = new Date(Date.now() + horas * 60 * 60 * 1000);

    await this.repo.update(usuario.id, { tokenHash: hashToken(token), tokenExpira: expira });
    return { token, expira };
  }

  /** Contas criadas antes desta etapa já têm senha, então contam como ativadas. */
  private async completarContasAntigas() {
    await this.repo.query(
      `UPDATE "usuarios" SET "ativadoEm" = "criadoEm" WHERE "ativadoEm" IS NULL AND "senhaHash" IS NOT NULL`,
    );
  }

  /** Cria a conta da coordenação na primeira vez que o servidor sobe. */
  private async garantirAdmin() {
    const email = (this.config.get<string>('ADMIN_EMAIL') ?? 'admin@gmail.com')
      .trim()
      .toLowerCase();
    const senha = this.config.get<string>('ADMIN_SENHA');

    if (!senha || senha.length < 8) {
      this.log.warn(
        'ADMIN_SENHA ausente ou com menos de 8 caracteres no .env: a conta da coordenação não foi criada.',
      );
      return;
    }

    if (await this.buscarPorEmail(email)) return;

    await this.repo.save(
      this.repo.create({
        nome: 'Coordenação',
        email,
        papel: 'admin',
        curso: null,
        senhaHash: await bcrypt.hash(senha, 12),
        ativo: true,
        ativadoEm: new Date(),
      }),
    );
    this.log.log(`Conta da coordenação criada: ${email}`);
  }
}