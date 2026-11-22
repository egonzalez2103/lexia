import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Aplicacion } from '../entities/aplicacion.entity';
import { GrupoPermiso } from '../entities/grupo-permiso.entity';
import { RolesGuard } from './auth';
import { PermisosGuard } from './permisos.guard';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Aplicacion, GrupoPermiso])],
  providers: [RolesGuard, PermisosGuard],
  exports: [RolesGuard, PermisosGuard, TypeOrmModule],
})
export class CommonModule {}
