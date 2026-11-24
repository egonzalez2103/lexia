import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CajaGeneralDespacho } from '../entities/caja-general-despacho.entity';
import { CorteDespacho } from '../entities/corte-despacho.entity';
import { CuadreDespacho } from '../entities/cuadre-despacho.entity';
import { MovimientoDespacho } from '../entities/movimiento-despacho.entity';
import { User } from '../entities/user.entity';
import { CajaGeneralController } from './caja-general.controller';
import { CajaGeneralService } from './caja-general.service';

@Module({
  imports: [TypeOrmModule.forFeature([CajaGeneralDespacho, CorteDespacho, CuadreDespacho, MovimientoDespacho, User])],
  controllers: [CajaGeneralController],
  providers: [CajaGeneralService],
})
export class CajaGeneralModule {}
