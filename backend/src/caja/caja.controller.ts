import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, Roles, RolesGuard } from '../common/auth';
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
  @AppPermiso('caja')
  resumen() {
    return this.caja.resumen();
  }

  @Post('movimientos')
  @AppPermiso('caja', 'insertar')
  mover(@Body() dto: CreateMovimientoDto) {
    return this.caja.mover(dto);
  }

  @Post('cortes')
  @AppPermiso('caja', 'insertar')
  cortar(@Body() dto: CreateCorteDto) {
    return this.caja.cortar(dto);
  }
}
