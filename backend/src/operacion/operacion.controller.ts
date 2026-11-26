import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthUser, CurrentUser, JwtAuthGuard } from '../common/auth';
import { AbonoDto, AudienciaDto, CargoDto, DepositoDto, DocumentoDto, EquipoDto, RechazoDto } from './dto';
import { OperacionService } from './operacion.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class OperacionController {
  constructor(private readonly operacion: OperacionService) {}

  @Get('agenda')
  agenda(@CurrentUser() user: AuthUser, @Query('desde') desde?: string, @Query('hasta') hasta?: string) {
    return this.operacion.agenda(user, desde, hasta);
  }

  @Post('audiencias')
  crearAudiencia(@CurrentUser() user: AuthUser, @Body() dto: AudienciaDto) {
    return this.operacion.crearAudiencia(user, dto);
  }

  @Delete('audiencias/:id')
  quitarAudiencia(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.operacion.quitarAudiencia(user, Number(id));
  }

  @Get('documentos')
  documentos(@CurrentUser() user: AuthUser, @Query('expediente_id') expedienteId?: string) {
    return this.operacion.documentosDe(user, Number(expedienteId));
  }

  @Post('documentos')
  crearDocumento(@CurrentUser() user: AuthUser, @Body() dto: DocumentoDto) {
    return this.operacion.crearDocumento(user, dto);
  }

  @Delete('documentos/:id')
  quitarDocumento(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.operacion.quitarDocumento(user, Number(id));
  }

  @Get('actuaciones')
  actuaciones(@CurrentUser() user: AuthUser, @Query('expediente_id') expedienteId?: string) {
    return this.operacion.actuaciones(user, Number(expedienteId));
  }

  @Get('cartera')
  cartera(@CurrentUser() user: AuthUser) {
    return this.operacion.cartera(user);
  }

  @Post('cargos')
  crearCargo(@CurrentUser() user: AuthUser, @Body() dto: CargoDto) {
    return this.operacion.crearCargo(user, dto);
  }

  @Post('abonos')
  crearAbono(@CurrentUser() user: AuthUser, @Body() dto: AbonoDto) {
    return this.operacion.crearAbono(user, dto);
  }

  @Get('abonos/:id')
  abono(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.operacion.abono(user, Number(id));
  }

  @Get('depositos')
  depositos(@CurrentUser() user: AuthUser) {
    return this.operacion.depositosDe(user);
  }

  @Post('depositos')
  crearDeposito(@CurrentUser() user: AuthUser, @Body() dto: DepositoDto) {
    return this.operacion.crearDeposito(user, dto);
  }

  @Post('depositos/:id/autorizar')
  autorizar(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.operacion.autorizarDeposito(user, Number(id));
  }

  @Post('depositos/:id/rechazar')
  rechazar(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: RechazoDto) {
    return this.operacion.rechazarDeposito(user, Number(id), dto);
  }

  @Get('equipo')
  equipo(@CurrentUser() user: AuthUser) {
    return this.operacion.equipo(user);
  }

  @Patch('equipo/:id')
  asignar(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: EquipoDto) {
    return this.operacion.asignar(user, Number(id), dto);
  }
}
