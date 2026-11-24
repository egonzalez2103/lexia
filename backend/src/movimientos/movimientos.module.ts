import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CajaGeneralDespacho } from '../entities/caja-general-despacho.entity';
import { Cliente } from '../entities/cliente.entity';
import { CorteDespacho } from '../entities/corte-despacho.entity';
import { MovimientoDespacho } from '../entities/movimiento-despacho.entity';
import { User } from '../entities/user.entity';
import { MovimientosController } from './movimientos.controller';
import { MovimientosService } from './movimientos.service';

@Module({
  imports: [TypeOrmModule.forFeature([MovimientoDespacho, CorteDespacho, CajaGeneralDespacho, User, Cliente])],
  controllers: [MovimientosController],
  providers: [MovimientosService],
  exports: [MovimientosService],
})
export class MovimientosModule {}
