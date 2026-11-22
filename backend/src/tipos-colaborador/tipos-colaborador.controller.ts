import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, Roles, RolesGuard } from '../common/auth';
import { UserRole } from '../common/enums';
import { AppPermiso } from '../common/permiso';
import { PermisosGuard } from '../common/permisos.guard';
import { TipoColaboradorDto } from './dto';
import { TiposColaboradorService } from './tipos-colaborador.service';

@Controller('tipos-colaborador')
@UseGuards(JwtAuthGuard, RolesGuard, PermisosGuard)
export class TiposColaboradorController {
  constructor(private readonly tipos: TiposColaboradorService) {}

  @Get()
  @Roles(UserRole.DUENO, UserRole.PERSONAL)
  @AppPermiso(['tipos-colaborador', 'colaboradores'])
  list() {
    return this.tipos.list();
  }

  @Post()
  @Roles(UserRole.DUENO, UserRole.PERSONAL)
  @AppPermiso('tipos-colaborador', 'insertar')
  create(@Body() dto: TipoColaboradorDto) {
    return this.tipos.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.DUENO, UserRole.PERSONAL)
  @AppPermiso('tipos-colaborador', 'actualizar')
  update(@Param('id') id: string, @Body() dto: TipoColaboradorDto) {
    return this.tipos.update(Number(id), dto);
  }

  @Delete(':id')
  @Roles(UserRole.DUENO, UserRole.PERSONAL)
  @AppPermiso('tipos-colaborador', 'eliminar')
  remove(@Param('id') id: string) {
    return this.tipos.remove(Number(id));
  }
}
