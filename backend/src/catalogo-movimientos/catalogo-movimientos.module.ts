import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CuentaBancaria } from '../entities/cuenta-bancaria.entity';
import { TipoMovimientoDespacho } from '../entities/tipo-movimiento-despacho.entity';
import { TipoMovimientoUsuario } from '../entities/tipo-movimiento-usuario.entity';
import { User } from '../entities/user.entity';
import { CatalogoMovimientosService } from './catalogo-movimientos.service';
import { CuentasBancariasController } from './cuentas-bancarias.controller';
import { TiposMovimientoController } from './tipos-movimiento.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TipoMovimientoDespacho, TipoMovimientoUsuario, CuentaBancaria, User])],
  controllers: [TiposMovimientoController, CuentasBancariasController],
  providers: [CatalogoMovimientosService],
})
export class CatalogoMovimientosModule {}
