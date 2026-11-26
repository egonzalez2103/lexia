import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthUser, CurrentUser, JwtAuthGuard } from '../common/auth';
import { ComisionesService } from './comisiones.service';
import { ComisionDto, GenerarCorteDto, PagarComisionDto, PagarVariasDto } from './dto';

@Controller('comisiones')
@UseGuards(JwtAuthGuard)
export class ComisionesController {
  constructor(private readonly comisiones: ComisionesService) {}

  @Get()
  resumen(
    @CurrentUser() user: AuthUser,
    @Query('despacho_id') despachoId?: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
    @Query('usuario_id') usuarioId?: string,
    @Query('estado') estado?: string,
  ) {
    return this.comisiones.resumen(user, numero(despachoId), desde, hasta, numero(usuarioId), estado);
  }

  @Post('cortes')
  generar(@CurrentUser() user: AuthUser, @Body() dto: GenerarCorteDto) {
    return this.comisiones.generar(user, dto);
  }

  @Post('pagar')
  pagarVarias(@CurrentUser() user: AuthUser, @Body() dto: PagarVariasDto) {
    return this.comisiones.pagarVarias(user, dto);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: ComisionDto) {
    return this.comisiones.create(user, dto);
  }

  @Post(':id/pagar')
  pagar(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: PagarComisionDto) {
    return this.comisiones.pagar(user, Number(id), dto.despacho_id);
  }
}

function numero(value?: string) {
  return value && /^\d+$/.test(value) ? Number(value) : undefined;
}
