import { Module } from '@nestjs/common';
import { TiposColaboradorModule } from '../tipos-colaborador/tipos-colaborador.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Colaborador } from '../entities/colaborador.entity';
import { Grupo } from '../entities/grupo.entity';
import { TipoColaborador } from '../entities/tipo-colaborador.entity';
import { User } from '../entities/user.entity';
import { ColaboradoresController } from './colaboradores.controller';
import { ColaboradoresService } from './colaboradores.service';

@Module({
  imports: [TypeOrmModule.forFeature([Colaborador, TipoColaborador, User, Grupo]), TiposColaboradorModule],
  controllers: [ColaboradoresController],
  providers: [ColaboradoresService],
  exports: [ColaboradoresService],
})
export class ColaboradoresModule {}
