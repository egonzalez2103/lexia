import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Colaborador } from '../entities/colaborador.entity';
import { Grupo } from '../entities/grupo.entity';
import { TipoColaborador } from '../entities/tipo-colaborador.entity';
import { TiposColaboradorController } from './tipos-colaborador.controller';
import { TiposColaboradorService } from './tipos-colaborador.service';

@Module({
  imports: [TypeOrmModule.forFeature([TipoColaborador, Colaborador, Grupo])],
  controllers: [TiposColaboradorController],
  providers: [TiposColaboradorService],
  exports: [TiposColaboradorService],
})
export class TiposColaboradorModule {}