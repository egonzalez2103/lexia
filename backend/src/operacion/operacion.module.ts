import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Abono } from '../entities/abono.entity';
import { Asunto } from '../entities/asunto.entity';
import { Audiencia } from '../entities/audiencia.entity';
import { Cargo } from '../entities/cargo.entity';
import { CatalogoJuridico } from '../entities/catalogo-juridico.entity';
import { Cliente } from '../entities/cliente.entity';
import { CuentaBancaria } from '../entities/cuenta-bancaria.entity';
import { Deposito } from '../entities/deposito.entity';
import { DocumentoExpediente } from '../entities/documento-expediente.entity';
import { Escrito } from '../entities/escrito.entity';
import { Expediente } from '../entities/expediente.entity';
import { MovimientoDespacho } from '../entities/movimiento-despacho.entity';
import { Promocion } from '../entities/promocion.entity';
import { User } from '../entities/user.entity';
import { OperacionController } from './operacion.controller';
import { OperacionService } from './operacion.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Audiencia,
      DocumentoExpediente,
      Cargo,
      Abono,
      Deposito,
      Expediente,
      Promocion,
      Escrito,
      Asunto,
      Cliente,
      CuentaBancaria,
      MovimientoDespacho,
      User,
      CatalogoJuridico,
    ]),
  ],
  controllers: [OperacionController],
  providers: [OperacionService],
})
export class OperacionModule {}
