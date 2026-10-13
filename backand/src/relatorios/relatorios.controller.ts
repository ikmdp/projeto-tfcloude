import { Controller, Get, Header, StreamableFile } from '@nestjs/common';
import { AtividadesService } from '../atividades/atividades.service.js';
import { Papeis } from '../auth/papeis.decorator.js';
import { UsuarioAtual } from '../auth/usuario-atual.decorator.js';
import { Usuario } from '../usuarios/usuario.entity.js';
import { RelatoriosService } from './relatorios.service.js';

function hoje(): string {
  return new Date().toISOString().slice(0, 10);
}

function plural(n: number): string {
  return `${n} ${n === 1 ? 'linha' : 'linhas'}`;
}

@Papeis('admin')
@Controller('relatorios')
export class RelatoriosController {
  constructor(
    private readonly relatorios: RelatoriosService,
    private readonly atividades: AtividadesService,
  ) {}

  @Get()
  gerar() {
    return this.relatorios.gerar();
  }

  @Header('X-Content-Type-Options', 'nosniff')
  @Header('Cache-Control', 'private, no-store')
  @Get('trabalhos.csv')
  async trabalhos(@UsuarioAtual() admin: Usuario) {
    const { conteudo, linhas } = await this.relatorios.csvTrabalhos();
    await this.atividades.registrar(admin.nome, 'Relatório exportado', `Trabalhos (CSV) · ${plural(linhas)}`);

    return new StreamableFile(Buffer.from(conteudo, 'utf8'), {
      type: 'text/csv; charset=utf-8',
      disposition: `attachment; filename="tfcloud-trabalhos-${hoje()}.csv"`,
    });
  }

  @Header('X-Content-Type-Options', 'nosniff')
  @Header('Cache-Control', 'private, no-store')
  @Get('resumo.csv')
  async resumo(@UsuarioAtual() admin: Usuario) {
    const { conteudo, linhas } = await this.relatorios.csvResumo();
    await this.atividades.registrar(admin.nome, 'Relatório exportado', `Resumo (CSV) · ${plural(linhas)}`);

    return new StreamableFile(Buffer.from(conteudo, 'utf8'), {
      type: 'text/csv; charset=utf-8',
      disposition: `attachment; filename="tfcloud-resumo-${hoje()}.csv"`,
    });
  }
}