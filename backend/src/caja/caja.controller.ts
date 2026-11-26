import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthUser, CurrentUser, JwtAuthGuard, Roles, RolesGuard } from '../common/auth';
import { UserRole } from '../common/enums';
import { AppPermiso } from '../common/permiso';
import { PermisosGuard } from '../common/permisos.guard';
import { CajaService } from './caja.service';
import { CreateCorteDto, CreateMovimientoDto } from './dto';

@Controller('caja')
@UseGuards(JwtAuthGuard, RolesGuard, PermisosGuard)
@Roles(UserRole.DUENO, UserRole.PERSONAL)
export class CajaController {
  constructor(private readonly caja: CajaService) {}

  @Get()
  @AppPermiso(['caja', 'caja-general', 'movimientos'])
  resumen() {
    return this.caja.resumen();
  }

  @Post('movimientos')
  @AppPermiso(['caja', 'caja-general', 'movimientos'], 'insertar')
  mover(@CurrentUser() user: AuthUser, @Body() dto: CreateMovimientoDto) {
    return this.caja.mover(dto, user);
  }

  @Post('cortes')
  @AppPermiso(['caja', 'caja-general', 'movimientos'], 'insertar')
  cortar(@CurrentUser() user: AuthUser, @Body() dto: CreateCorteDto) {
    return this.caja.cortar(dto, user);
  }
}
