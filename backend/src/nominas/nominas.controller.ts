import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AuthUser, CurrentUser, JwtAuthGuard, Roles, RolesGuard } from '../common/auth';
import { UserRole } from '../common/enums';
import { AppPermiso } from '../common/permiso';
import { PermisosGuard } from '../common/permisos.guard';
import { ArchivoSemanaDto, CrearPagoNominaDto, ReciboNominaDto } from './dto';
import { NominasService } from './nominas.service';

@Controller('nominas')
@UseGuards(JwtAuthGuard, RolesGuard, PermisosGuard)
@Roles(UserRole.DUENO, UserRole.PERSONAL)
export class NominasController {
  constructor(private readonly nominas: NominasService) {}

  @Get('semana')
  @AppPermiso('nominas')
  semana(@Query('semana') semana?: string) {
    return this.nominas.resumen(semana ?? '');
  }

  @Post('pagos')
  @AppPermiso('nominas', 'insertar')
  pagar(@CurrentUser() user: AuthUser, @Body() dto: CrearPagoNominaDto) {
    return this.nominas.pagar(dto, user);
  }

  @Post('semana/comprobante')
  @AppPermiso('nominas', 'insertar')
  comprobante(@CurrentUser() user: AuthUser, @Body() dto: ArchivoSemanaDto) {
    return this.nominas.comprobante(dto, user);
  }

  @Post('recibos')
  @AppPermiso('nominas', 'insertar')
  recibo(@CurrentUser() user: AuthUser, @Body() dto: ReciboNominaDto) {
    return this.nominas.recibo(dto, user);
  }
}
