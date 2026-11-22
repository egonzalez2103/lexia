import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Colaborador } from '../entities/colaborador.entity';
import { Despacho } from '../entities/despacho.entity';
import { Expediente } from '../entities/expediente.entity';
import { MovimientoCaja } from '../entities/movimiento-caja.entity';
import { NominaPago } from '../entities/nomina-pago.entity';
import { ReportesController } from './reportes.controller';
import { ReportesService } from './reportes.service';

@Module({
  imports: [TypeOrmModule.forFeature([Despacho, Colaborador, MovimientoCaja, NominaPago, Expediente])],
  controllers: [ReportesController],
  providers: [ReportesService],
})
export class ReportesModule {}
