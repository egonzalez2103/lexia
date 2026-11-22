import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, Roles, RolesGuard } from '../common/auth';
import { UserRole } from '../common/enums';
import { AppPermiso } from '../common/permiso';
import { PermisosGuard } from '../common/permisos.guard';
import { ReportesService } from './reportes.service';

@Controller('reportes')
@UseGuards(JwtAuthGuard, RolesGuard, PermisosGuard)
@Roles(UserRole.DUENO, UserRole.PERSONAL)
export class ReportesController {
  constructor(private readonly reportes: ReportesService) {}

  @Get('resumen')
  @AppPermiso('reportes')
  resumen() {
    return this.reportes.resumen();
  }
}
