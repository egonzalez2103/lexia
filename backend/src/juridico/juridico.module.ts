import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Asunto } from '../entities/asunto.entity';
import { Autoridad } from '../entities/autoridad.entity';
import { CatalogoJuridico } from '../entities/catalogo-juridico.entity';
import { Cliente } from '../entities/cliente.entity';
import { Escrito } from '../entities/escrito.entity';
import { Expediente } from '../entities/expediente.entity';
import { Promocion } from '../entities/promocion.entity';
import { Termino } from '../entities/termino.entity';
import { JuridicoController } from './juridico.controller';
import { JuridicoService } from './juridico.service';

@Module({
  imports: [TypeOrmModule.forFeature([CatalogoJuridico, Autoridad, Asunto, Cliente, Expediente, Termino, Promocion, Escrito])],
  controllers: [JuridicoController],
  providers: [JuridicoService],
})
export class JuridicoModule {}
