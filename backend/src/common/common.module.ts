import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Aplicacion } from '../entities/aplicacion.entity';
import { Despacho } from '../entities/despacho.entity';
import { GrupoPermiso } from '../entities/grupo-permiso.entity';
import { AlcanceService } from './alcance.service';
import { RolesGuard } from './auth';
import { PermisosGuard } from './permisos.guard';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Aplicacion, GrupoPermiso, Despacho])],
  providers: [RolesGuard, PermisosGuard, AlcanceService],
  exports: [RolesGuard, PermisosGuard, AlcanceService, TypeOrmModule],
})
export class CommonModule {}
