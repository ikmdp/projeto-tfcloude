import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Todas as rotas começam com /api
  app.setGlobalPrefix('api');

  // Recusa dados fora do formato esperado
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );

  // Só o front-end do projeto pode chamar a API pelo navegador
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:4200',
    exposedHeaders: ['Content-Disposition'],
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();