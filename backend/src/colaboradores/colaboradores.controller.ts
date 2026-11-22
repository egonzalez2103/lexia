import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, Roles, RolesGuard } from '../common/auth';
import { UserRole } from '../common/enums';
import { AppPermiso } from '../common/permiso';
import { PermisosGuard } from '../common/permisos.guard';
import { ColaboradoresService } from './colaboradores.service';
import { CreateColaboradorDto, UpdateColaboradorDto } from './dto';

@Controller('colaboradores')
@UseGuards(JwtAuthGuard, RolesGuard, PermisosGuard)
@Roles(UserRole.DUENO, UserRole.PERSONAL)
export class ColaboradoresController {
  constructor(private readonly colaboradores: ColaboradoresService) {}

  @Get()
  @AppPermiso('colaboradores')
  list() {
    return this.colaboradores.list();
  }

  @Post()
  @AppPermiso('colaboradores', 'insertar')
  create(@Body() dto: CreateColaboradorDto) {
    return this.colaboradores.create(dto);
  }

  @Patch(':id')
  @AppPermiso('colaboradores', 'actualizar')
  update(@Param('id') id: string, @Body() dto: UpdateColaboradorDto) {
    return this.colaboradores.update(Number(id), dto);
  }
}
