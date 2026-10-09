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
import { Papeis } from '../auth/papeis.decorator.js';
import { UsuarioAtual } from '../auth/usuario-atual.decorator.js';
import { Usuario } from '../usuarios/usuario.entity.js';
import { TAMANHO_MAXIMO } from './constantes.js';
import { DadosEnvioDto } from './dto/dados-envio.dto.js';
import { DecisaoDto } from './dto/decisao.dto.js';
import { FiltroStatusDto } from './dto/filtro-status.dto.js';
import { MotivoDto } from './dto/motivo.dto.js';
import { EnviosService } from './envios.service.js';

// Um arquivo só, até 25 MB, e poucos campos de texto
const OPCOES_UPLOAD = {
  limits: { fileSize: TAMANHO_MAXIMO, files: 1, fields: 12, fieldSize: 20 * 1024 },
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
  constructor(private readonly envios: EnviosService) {}

  // ---------- Professor ----------

  @Papeis('professor')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @UseInterceptors(FileInterceptor('arquivo', OPCOES_UPLOAD))
  @Post()
  criar(
    @UsuarioAtual() usuario: Usuario,
    @Body() dto: DadosEnvioDto,
    @UploadedFile() arquivo?: Express.Multer.File,
  ) {
    return this.envios.criar(usuario, dto, arquivo);
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
  reenviar(
    @UsuarioAtual() usuario: Usuario,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DadosEnvioDto,
    @UploadedFile() arquivo?: Express.Multer.File,
  ) {
    return this.envios.reenviar(usuario, id, dto, arquivo);
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
  decidir(
    @UsuarioAtual() admin: Usuario,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DecisaoDto,
  ) {
    return this.envios.decidir(id, admin, dto);
  }

  @Papeis('admin')
  @HttpCode(200)
  @Post(':id/desfazer')
  desfazer(@Param('id', ParseUUIDPipe) id: string) {
    return this.envios.desfazer(id);
  }

  @Papeis('admin')
  @Patch(':id')
  editar(
    @UsuarioAtual() admin: Usuario,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DadosEnvioDto,
  ) {
    return this.envios.editar(id, admin, dto);
  }

  @Papeis('admin')
  @HttpCode(200)
  @Post(':id/remover')
  remover(
    @UsuarioAtual() admin: Usuario,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MotivoDto,
  ) {
    return this.envios.removerDoAcervo(id, admin, dto.motivo);
  }

  @Papeis('admin')
  @HttpCode(200)
  @Post(':id/restaurar')
  restaurar(@UsuarioAtual() admin: Usuario, @Param('id', ParseUUIDPipe) id: string) {
    return this.envios.restaurar(id, admin);
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