import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Asunto } from '../entities/asunto.entity';
import { Audiencia } from '../entities/audiencia.entity';
import { Autoridad } from '../entities/autoridad.entity';
import { Cargo } from '../entities/cargo.entity';
import { CatalogoJuridico } from '../entities/catalogo-juridico.entity';
import { Cliente } from '../entities/cliente.entity';
import { Deposito } from '../entities/deposito.entity';
import { Despacho } from '../entities/despacho.entity';
import { DocumentoExpediente } from '../entities/documento-expediente.entity';
import { Expediente } from '../entities/expediente.entity';
import { Parte } from '../entities/parte.entity';
import { Promocion } from '../entities/promocion.entity';
import { Termino } from '../entities/termino.entity';
import { User } from '../entities/user.entity';
import { DemoSedeSeed } from './demo-sede.seed';
import { SeedService } from './seed.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Despacho,
      CatalogoJuridico,
      Autoridad,
      Cliente,
      Asunto,
      Expediente,
      Parte,
      Termino,
      Promocion,
      Audiencia,
      DocumentoExpediente,
      Cargo,
      Deposito,
    ]),
  ],
  providers: [SeedService, DemoSedeSeed],
})
export class SeedModule {}
