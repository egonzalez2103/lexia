import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, Roles, RolesGuard } from '../common/auth';
import { UserRole } from '../common/enums';
import { AppPermiso } from '../common/permiso';
import { PermisosGuard } from '../common/permisos.guard';
import { DespachosService } from './despachos.service';
import { CreateDespachoDto, CreateMiembroDto, UpdateDespachoDto } from './dto';

@Controller('despachos')
export class DespachosController {
  constructor(private readonly despachos: DespachosService) {}

  @Get('publico/:slug')
  publico(@Param('slug') slug: string) {
    return this.despachos.publicBySlug(slug);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard, PermisosGuard)
  @Roles(UserRole.DUENO, UserRole.PERSONAL)
  @AppPermiso('despachos')
  list() {
    return this.despachos.list();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, PermisosGuard)
  @Roles(UserRole.DUENO, UserRole.PERSONAL)
  @AppPermiso('despachos', 'insertar')
  create(@Body() dto: CreateDespachoDto) {
    return this.despachos.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, PermisosGuard)
  @Roles(UserRole.DUENO, UserRole.PERSONAL)
  @AppPermiso('despachos', 'actualizar')
  update(@Param('id') id: string, @Body() dto: UpdateDespachoDto) {
    return this.despachos.update(Number(id), dto);
  }

  @Post(':id/miembros')
  @UseGuards(JwtAuthGuard, RolesGuard, PermisosGuard)
  @Roles(UserRole.DUENO, UserRole.PERSONAL)
  @AppPermiso('despachos', 'insertar')
  addMember(@Param('id') id: string, @Body() dto: CreateMiembroDto) {
    return this.despachos.addMember(Number(id), dto);
  }
}
