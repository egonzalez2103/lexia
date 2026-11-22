import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, Roles, RolesGuard } from '../common/auth';
import { UserRole } from '../common/enums';
import { AppPermiso } from '../common/permiso';
import { PermisosGuard } from '../common/permisos.guard';
import { GrupoDto, PermisoDto } from './dto';
import { GruposService } from './grupos.service';

@Controller('grupos')
@UseGuards(JwtAuthGuard, RolesGuard, PermisosGuard)
@Roles(UserRole.DUENO, UserRole.PERSONAL)
export class GruposController {
  constructor(private readonly grupos: GruposService) {}

  @Get()
  @AppPermiso(['grupos', 'tipos-colaborador'])
  list() {
    return this.grupos.list();
  }

  @Get('aplicaciones')
  @AppPermiso('grupos')
  aplicaciones() {
    return this.grupos.aplicacionesDe();
  }

  @Get(':id/permisos')
  @AppPermiso('grupos')
  permisos(@Param('id') id: string) {
    return this.grupos.permisosDeGrupo(Number(id));
  }

  @Post()
  @AppPermiso('grupos', 'insertar')
  create(@Body() dto: GrupoDto) {
    return this.grupos.create(dto);
  }

  @Patch(':id')
  @AppPermiso('grupos', 'actualizar')
  update(@Param('id') id: string, @Body() dto: GrupoDto) {
    return this.grupos.update(Number(id), dto);
  }

  @Delete(':id')
  @AppPermiso('grupos', 'eliminar')
  remove(@Param('id') id: string) {
    return this.grupos.remove(Number(id));
  }

  @Post(':id/permisos')
  @AppPermiso('grupos', 'actualizar')
  guardarPermiso(@Param('id') id: string, @Body() dto: PermisoDto) {
    return this.grupos.guardarPermiso(Number(id), dto);
  }

  @Delete(':id/permisos/:aplicacionId')
  @AppPermiso('grupos', 'eliminar')
  quitarPermiso(@Param('id') id: string, @Param('aplicacionId') aplicacionId: string) {
    return this.grupos.quitarPermiso(Number(id), Number(aplicacionId));
  }
}
