import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { CommonModule } from './common/common.module';
import { CajaModule } from './caja/caja.module';
import { ColaboradoresModule } from './colaboradores/colaboradores.module';
import { DespachosModule } from './despachos/despachos.module';
import { ExpedientesModule } from './expedientes/expedientes.module';
import { GruposModule } from './grupos/grupos.module';
import { HealthController } from './health.controller';
import { NominasModule } from './nominas/nominas.module';
import { ReportesModule } from './reportes/reportes.module';
import { SeedModule } from './seed/seed.module';
import { TiposColaboradorModule } from './tipos-colaborador/tipos-colaborador.module';
import { UploadsModule } from './uploads/uploads.module';

@Module({
  controllers: [HealthController],
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql' as const,
        host: config.get<string>('DB_HOST', '127.0.0.1'),
        port: parseInt(config.get<string>('DB_PORT', '3306'), 10),
        username: config.get<string>('DB_USER', 'root'),
        password: config.get<string>('DB_PASSWORD') ?? '',
        database: config.get<string>('DB_NAME', 'juridico'),
        autoLoadEntities: true,
        synchronize: config.get<string>('DB_SYNC', 'true') !== 'false',
        charset: 'utf8mb4',
        logging: ['error' as const],
      }),
    }),
    CommonModule,
    AuthModule,
    DespachosModule,
    ExpedientesModule,
    ColaboradoresModule,
    GruposModule,
    TiposColaboradorModule,
    CajaModule,
    NominasModule,
    ReportesModule,
    UploadsModule,
    SeedModule,
  ],
})
export class AppModule {}
