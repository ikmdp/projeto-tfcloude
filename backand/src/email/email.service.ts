import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailerLib from 'nodemailer';

// Funciona tanto em módulo ES quanto em CommonJS
const nodemailer: typeof nodemailerLib = (nodemailerLib as any).default ?? nodemailerLib;

/** Impede que um nome digitado vire código dentro do e-mail. */
function escapar(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

@Injectable()
export class EmailService {
  private readonly log = new Logger(EmailService.name);
  private readonly transporte: ReturnType<typeof nodemailer.createTransport> | null;
  private readonly remetente: string;
  private readonly producao: boolean;
  private readonly urlFront: string;

  constructor(config: ConfigService) {
    const host = config.get<string>('SMTP_HOST');
    const porta = Number(config.get<string>('SMTP_PORT') ?? 587);
    const usuario = config.get<string>('SMTP_USER');
    const senha = config.get<string>('SMTP_PASS');

    this.remetente =
      config.get<string>('EMAIL_REMETENTE') ?? 'TFCloud <nao-responda@tfcloud.local>';
    this.producao = config.get<string>('NODE_ENV') === 'production';
    this.urlFront = (config.get<string>('FRONTEND_URL') ?? 'http://localhost:4200').replace(
      /\/+$/,
      '',
    );

    this.transporte = host
      ? nodemailer.createTransport({
          host,
          port: porta,
          secure: porta === 465,
          auth: usuario ? { user: usuario, pass: senha } : undefined,
        })
      : null;

    if (!this.transporte) {
      this.log.warn(
        'SMTP_HOST não configurado: os e-mails não serão enviados. Em desenvolvimento, o link aparece neste terminal.',
      );
    }
  }

  /** Monta o endereço que vai no e-mail, apontando para o front-end. */
  link(caminho: string, token: string): string {
    return `${this.urlFront}${caminho}?token=${token}`;
  }

  enviarConvite(para: string, nome: string, link: string): Promise<boolean> {
    return this.enviar(
      para,
      'Ative sua conta no TFCloud',
      `Olá, ${nome}!\n\nA coordenação cadastrou você como professor(a) no TFCloud.\n` +
        `Para criar sua senha e acessar o sistema, abra o link abaixo (vale por 48 horas):\n\n${link}\n\n` +
        `Se você não esperava este e-mail, pode ignorá-lo.`,
      this.html(
        nome,
        'A coordenação cadastrou você como professor(a) no TFCloud. Para criar sua senha e acessar o sistema, use o botão abaixo. O link vale por 48 horas.',
        'Criar minha senha',
        link,
      ),
      link,
    );
  }

  enviarRecuperacao(para: string, nome: string, link: string): Promise<boolean> {
    return this.enviar(
      para,
      'Recuperação de senha do TFCloud',
      `Olá, ${nome}!\n\nRecebemos um pedido para criar uma nova senha.\n` +
        `Abra o link abaixo (vale por 1 hora):\n\n${link}\n\n` +
        `Se não foi você, ignore este e-mail: sua senha continua a mesma.`,
      this.html(
        nome,
        'Recebemos um pedido para criar uma nova senha. Use o botão abaixo. O link vale por 1 hora. Se não foi você, ignore este e-mail: sua senha continua a mesma.',
        'Criar nova senha',
        link,
      ),
      link,
    );
  }

  /** Devolve true só se o e-mail realmente foi entregue ao servidor de e-mail. Nunca lança erro. */
  private async enviar(
    para: string,
    assunto: string,
    texto: string,
    html: string,
    link: string,
  ): Promise<boolean> {
    if (!this.transporte) {
      if (this.producao) {
        this.log.error('SMTP não configurado em produção: e-mail não enviado.');
      } else {
        this.log.warn(`[DESENVOLVIMENTO] E-mail para ${para} ("${assunto}"). Link: ${link}`);
      }
      return false;
    }

    try {
      await this.transporte.sendMail({ from: this.remetente, to: para, subject: assunto, text: texto, html });
      return true;
    } catch (erro) {
      this.log.error(`Falha ao enviar e-mail para ${para}: ${(erro as Error).message}`);
      return false;
    }
  }

  private html(nome: string, mensagem: string, botao: string, link: string): string {
    return `
<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1a1b26">
  <h2 style="margin:0 0 16px">TFCloud</h2>
  <p>Olá, ${escapar(nome)}!</p>
  <p>${escapar(mensagem)}</p>
  <p style="margin:24px 0">
    <a href="${escapar(link)}" style="background:#4a69ff;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:bold">${escapar(botao)}</a>
  </p>
  <p style="font-size:12px;color:#666">Se o botão não abrir, copie este endereço no navegador:<br>${escapar(link)}</p>
</div>`;
  }
}