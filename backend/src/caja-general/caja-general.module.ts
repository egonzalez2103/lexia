import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CajaGeneralDespacho } from '../entities/caja-general-despacho.entity';
import { CorteDespacho } from '../entities/corte-despacho.entity';
import { CuentaBancaria } from '../entities/cuenta-bancaria.entity';
import { CuadreDespacho } from '../entities/cuadre-despacho.entity';
import { MovimientoDespacho } from '../entities/movimiento-despacho.entity';
import { RegistroMovimiento } from '../entities/registro-movimiento.entity';
import { TipoMovimientoDespacho } from '../entities/tipo-movimiento-despacho.entity';
import { TipoMovimientoUsuario } from '../entities/tipo-movimiento-usuario.entity';
import { User } from '../entities/user.entity';
import { CajaGeneralController } from './caja-general.controller';
import { CajaGeneralService } from './caja-general.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CajaGeneralDespacho,
      CorteDespacho,
      CuadreDespacho,
      MovimientoDespacho,
      User,
      TipoMovimientoDespacho,
      TipoMovimientoUsuario,
      CuentaBancaria,
      RegistroMovimiento,
    ]),
  ],
  controllers: [CajaGeneralController],
  providers: [CajaGeneralService],
})
export class CajaGeneralModule {}
