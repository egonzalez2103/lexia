import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BitacoraEdicion } from '../entities/bitacora-edicion.entity';
import { Cliente } from '../entities/cliente.entity';
import { Comision } from '../entities/comision.entity';
import { MovimientoDespacho } from '../entities/movimiento-despacho.entity';
import { User } from '../entities/user.entity';
import { ComisionesController } from './comisiones.controller';
import { ComisionesService } from './comisiones.service';

@Module({
  imports: [TypeOrmModule.forFeature([Comision, User, MovimientoDespacho, Cliente, BitacoraEdicion])],
  controllers: [ComisionesController],
  providers: [ComisionesService],
})
export class ComisionesModule {}