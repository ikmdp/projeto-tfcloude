/// <reference types="multer" />
import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'node:crypto';
import { createReadStream, type ReadStream } from 'node:fs';
import { mkdir, stat, unlink, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

export interface ArquivoSalvo {
  chave: string;
  tamanho: number;
  hash: string;
}

// Só aceitamos o formato que nós mesmos geramos: código aleatório + .pdf
const CHAVE_VALIDA = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$/;

@Injectable()
export class ArmazenamentoService implements OnModuleInit {
  private readonly pasta: string;

  constructor(config: ConfigService) {
    this.pasta = resolve(process.cwd(), config.get<string>('UPLOADS_DIR') ?? 'uploads');
  }

  async onModuleInit() {
    await mkdir(this.pasta, { recursive: true });
  }

  /** Confere que é um PDF de verdade e guarda no disco com um nome gerado pelo servidor. */
  async salvar(arquivo: Express.Multer.File): Promise<ArquivoSalvo> {
    const conteudo = arquivo.buffer;

    // Um PDF sempre começa com "%PDF-". A extensão e o tipo informado pelo navegador não bastam.
    if (!conteudo || conteudo.length < 5 || conteudo.subarray(0, 5).toString('latin1') !== '%PDF-') {
      throw new BadRequestException('O arquivo precisa ser um PDF válido.');
    }

    const chave = `${randomUUID()}.pdf`;
    // "wx": nunca sobrescreve um arquivo que já exista
    await writeFile(join(this.pasta, chave), conteudo, { flag: 'wx', mode: 0o640 });

    return {
      chave,
      tamanho: conteudo.length,
      hash: createHash('sha256').update(conteudo).digest('hex'),
    };
  }

  /** Abre o arquivo para download. */
  async abrir(chave: string): Promise<{ stream: ReadStream; tamanho: number }> {
    if (!CHAVE_VALIDA.test(chave)) throw new NotFoundException('Arquivo não encontrado.');

    const caminho = join(this.pasta, chave);
    try {
      const info = await stat(caminho);
      return { stream: createReadStream(caminho), tamanho: info.size };
    } catch {
      throw new NotFoundException('O arquivo deste trabalho não está mais disponível.');
    }
  }

  /** Apaga o arquivo. Se não der, não atrapalha o resto. */
  async remover(chave: string) {
    if (!CHAVE_VALIDA.test(chave)) return;
    try {
      await unlink(join(this.pasta, chave));
    } catch {
      // Já não existia: tudo bem.
    }
  }
}