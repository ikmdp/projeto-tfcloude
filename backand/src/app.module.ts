import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { EnviosModule } from './envios/envios.module.js';
import { ProfessoresModule } from './professores/professores.module.js';
import { UsuariosModule } from './usuarios/usuarios.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'better-sqlite3' as const,
        database: config.get<string>('DATABASE_FILE', 'tfcloud.sqlite'),
        autoLoadEntities: true,
        // Cria e ajusta as tabelas sozinho. Só para desenvolvimento.
        synchronize: config.get<string>('NODE_ENV') !== 'production',
      }),
    }),
    // Limite geral: 120 requisições por minuto por endereço
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }]),
    UsuariosModule,
    AuthModule,
    ProfessoresModule,
    EnviosModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}