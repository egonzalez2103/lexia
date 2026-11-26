import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Asunto } from '../entities/asunto.entity';
import { Autoridad } from '../entities/autoridad.entity';
import { CatalogoJuridico } from '../entities/catalogo-juridico.entity';
import { Cliente } from '../entities/cliente.entity';
import { Escrito } from '../entities/escrito.entity';
import { Expediente } from '../entities/expediente.entity';
import { Parte } from '../entities/parte.entity';
import { Promocion } from '../entities/promocion.entity';
import { Termino } from '../entities/termino.entity';
import { VinculoExpediente } from '../entities/vinculo-expediente.entity';
import { ExpedientesController } from './expedientes.controller';
import { ExpedientesService } from './expedientes.service';

@Module({
  imports: [TypeOrmModule.forFeature([Expediente, Termino, Promocion, Escrito, Cliente, Asunto, CatalogoJuridico, Autoridad, Parte, VinculoExpediente])],
  controllers: [ExpedientesController],
  providers: [ExpedientesService],
})
export class ExpedientesModule {}
