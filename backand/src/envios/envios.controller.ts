import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { AtividadesService } from '../atividades/atividades.service.js';
import { Papeis } from '../auth/papeis.decorator.js';
import { UsuarioAtual } from '../auth/usuario-atual.decorator.js';
import { Usuario } from '../usuarios/usuario.entity.js';
import { TAMANHO_MAXIMO, type Decisao } from './constantes.js';
import { DadosEnvioDto } from './dto/dados-envio.dto.js';
import { DecisaoDto } from './dto/decisao.dto.js';
import { FiltroStatusDto } from './dto/filtro-status.dto.js';
import { MotivoDto } from './dto/motivo.dto.js';
import { EnviosService } from './envios.service.js';

// Um arquivo só, até 25 MB, e poucos campos de texto
const OPCOES_UPLOAD = {
  limits: { fileSize: TAMANHO_MAXIMO, files: 1, fields: 12, fieldSize: 20 * 1024 },
};

const ACAO_DA_DECISAO: Record<Decisao, string> = {
  aprovado: 'Trabalho aprovado',
  reprovado: 'Trabalho reprovado',
  ajustes: 'Ajustes solicitados',
};

/** Nome simples para navegadores antigos: só letras, números e alguns símbolos. */
function nomeAscii(nome: string): string {
  return nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w.\- ]+/g, '_');
}

/** Nome completo com acentos, no formato aceito pelos navegadores atuais. */
function nomeCodificado(nome: string): string {
  return encodeURIComponent(nome).replace(
    /['()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

@Controller('envios')
export class EnviosController {
  constructor(
    private readonly envios: EnviosService,
    private readonly atividades: AtividadesService,
  ) {}

  // ---------- Professor ----------

  @Papeis('professor')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @UseInterceptors(FileInterceptor('arquivo', OPCOES_UPLOAD))
  @Post()
  async criar(
    @UsuarioAtual() usuario: Usuario,
    @Body() dto: DadosEnvioDto,
    @UploadedFile() arquivo?: Express.Multer.File,
  ) {
    const envio = await this.envios.criar(usuario, dto, arquivo);
    await this.atividades.registrar(usuario.nome, 'Trabalho enviado', `${envio.titulo} · ${envio.autor}`);
    return envio;
  }

  @Papeis('professor')
  @Get('meus')
  meus(@UsuarioAtual() usuario: Usuario) {
    return this.envios.meus(usuario);
  }

  @Papeis('professor', 'admin')
  @Get('orientadores')
  orientadores() {
    return this.envios.orientadores();
  }

  @Papeis('professor')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @UseInterceptors(FileInterceptor('arquivo', OPCOES_UPLOAD))
  @HttpCode(200)
  @Post(':id/reenviar')
  async reenviar(
    @UsuarioAtual() usuario: Usuario,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DadosEnvioDto,
    @UploadedFile() arquivo?: Express.Multer.File,
  ) {
    const envio = await this.envios.reenviar(usuario, id, dto, arquivo);
    await this.atividades.registrar(
      usuario.nome,
      'Trabalho reenviado',
      `${envio.titulo} · ${envio.autor} · versão ${envio.versao}`,
    );
    return envio;
  }

  // ---------- Coordenação ----------

  @Papeis('admin')
  @Get('fila')
  fila() {
    return this.envios.fila();
  }

  @Papeis('admin')
  @Get()
  listar(@Query() filtro: FiltroStatusDto) {
    return this.envios.listar(filtro.status);
  }

  @Papeis('admin')
  @HttpCode(200)
  @Post(':id/decisao')
  async decidir(
    @UsuarioAtual() admin: Usuario,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DecisaoDto,
  ) {
    const envio = await this.envios.decidir(id, admin, dto);
    await this.atividades.registrar(
      admin.nome,
      ACAO_DA_DECISAO[dto.decisao],
      `${envio.titulo} · ${envio.autor}`,
    );
    return envio;
  }

  @Papeis('admin')
  @HttpCode(200)
  @Post(':id/desfazer')
  async desfazer(@UsuarioAtual() admin: Usuario, @Param('id', ParseUUIDPipe) id: string) {
    const envio = await this.envios.desfazer(id);
    await this.atividades.registrar(admin.nome, 'Decisão desfeita', `${envio.titulo} · ${envio.autor}`);
    return envio;
  }

  @Papeis('admin')
  @Patch(':id')
  async editar(
    @UsuarioAtual() admin: Usuario,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DadosEnvioDto,
  ) {
    const envio = await this.envios.editar(id, admin, dto);
    const resumo = envio.historico[envio.historico.length - 1]?.motivo ?? '';
    await this.atividades.registrar(
      admin.nome,
      'Trabalho editado',
      `${envio.titulo}${resumo ? ` · ${resumo}` : ''}`,
    );
    return envio;
  }

  @Papeis('admin')
  @HttpCode(200)
  @Post(':id/remover')
  async remover(
    @UsuarioAtual() admin: Usuario,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MotivoDto,
  ) {
    const envio = await this.envios.removerDoAcervo(id, admin, dto.motivo);
    await this.atividades.registrar(
      admin.nome,
      'Trabalho removido do acervo',
      `${envio.titulo} · ${envio.autor}`,
    );
    return envio;
  }

  @Papeis('admin')
  @HttpCode(200)
  @Post(':id/restaurar')
  async restaurar(@UsuarioAtual() admin: Usuario, @Param('id', ParseUUIDPipe) id: string) {
    const envio = await this.envios.restaurar(id, admin);
    await this.atividades.registrar(
      admin.nome,
      'Trabalho restaurado ao acervo',
      `${envio.titulo} · ${envio.autor}`,
    );
    return envio;
  }

  // ---------- Detalhe e download (a regra de acesso está no serviço) ----------

  @Get(':id')
  detalhe(@UsuarioAtual() usuario: Usuario, @Param('id', ParseUUIDPipe) id: string) {
    return this.envios.detalhe(usuario, id);
  }

  @Header('X-Content-Type-Options', 'nosniff')
  @Header('Cache-Control', 'private, no-store')
  @Get(':id/arquivo')
  async arquivo(@UsuarioAtual() usuario: Usuario, @Param('id', ParseUUIDPipe) id: string) {
    const { stream, tamanho, nome } = await this.envios.abrirArquivo(usuario, id);

    return new StreamableFile(stream, {
      type: 'application/pdf',
      length: tamanho,
      disposition: `attachment; filename="${nomeAscii(nome)}"; filename*=UTF-8''${nomeCodificado(nome)}`,
    });
  }
}