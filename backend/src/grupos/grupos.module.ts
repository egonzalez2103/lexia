import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Aplicacion } from '../entities/aplicacion.entity';
import { GrupoPermiso } from '../entities/grupo-permiso.entity';
import { Grupo } from '../entities/grupo.entity';
import { TipoColaborador } from '../entities/tipo-colaborador.entity';
import { User } from '../entities/user.entity';
import { GruposController } from './grupos.controller';
import { GruposService } from './grupos.service';

@Module({
  imports: [TypeOrmModule.forFeature([Grupo, Aplicacion, GrupoPermiso, User, TipoColaborador])],
  controllers: [GruposController],
  providers: [GruposService],
  exports: [GruposService],
})
export class GruposModule {}