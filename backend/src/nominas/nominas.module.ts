import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Colaborador } from '../entities/colaborador.entity';
import { NominaPago } from '../entities/nomina-pago.entity';
import { NominaRecibo } from '../entities/nomina-recibo.entity';
import { NominaSemana } from '../entities/nomina-semana.entity';
import { NominasController } from './nominas.controller';
import { NominasService } from './nominas.service';

@Module({
  imports: [TypeOrmModule.forFeature([NominaSemana, NominaPago, NominaRecibo, Colaborador])],
  controllers: [NominasController],
  providers: [NominasService],
})
export class NominasModule {}
