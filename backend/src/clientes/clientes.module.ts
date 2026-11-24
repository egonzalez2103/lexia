import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cliente } from '../entities/cliente.entity';
import { MovimientoDespacho } from '../entities/movimiento-despacho.entity';
import { ClientesController } from './clientes.controller';
import { ClientesService } from './clientes.service';

@Module({
  imports: [TypeOrmModule.forFeature([Cliente, MovimientoDespacho])],
  controllers: [ClientesController],
  providers: [ClientesService],
})
export class ClientesModule {}
