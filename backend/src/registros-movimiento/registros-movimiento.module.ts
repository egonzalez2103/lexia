import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CajaGeneralDespacho } from '../entities/caja-general-despacho.entity';
import { CuentaBancaria } from '../entities/cuenta-bancaria.entity';
import { RegistroMovimiento } from '../entities/registro-movimiento.entity';
import { TipoMovimientoDespacho } from '../entities/tipo-movimiento-despacho.entity';
import { TipoMovimientoUsuario } from '../entities/tipo-movimiento-usuario.entity';
import { User } from '../entities/user.entity';
import { RegistrosMovimientoController } from './registros-movimiento.controller';
import { RegistrosMovimientoService } from './registros-movimiento.service';

@Module({
  imports: [TypeOrmModule.forFeature([RegistroMovimiento, TipoMovimientoDespacho, TipoMovimientoUsuario, CuentaBancaria, CajaGeneralDespacho, User])],
  controllers: [RegistrosMovimientoController],
  providers: [RegistrosMovimientoService],
})
export class RegistrosMovimientoModule {}
