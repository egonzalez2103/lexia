import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cliente } from '../entities/cliente.entity';
import { Expediente } from '../entities/expediente.entity';
import { MovimientoDespacho } from '../entities/movimiento-despacho.entity';
import { User } from '../entities/user.entity';
import { ClientesController } from './clientes.controller';
import { ClientesService } from './clientes.service';

@Module({
  imports: [TypeOrmModule.forFeature([Cliente, MovimientoDespacho, Expediente, User])],
  controllers: [ClientesController],
  providers: [ClientesService],
})
export class ClientesModule {}
