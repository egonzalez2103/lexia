import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthUser, CurrentUser, JwtAuthGuard } from '../common/auth';
import { ComisionesService } from './comisiones.service';
import { ComisionDto, PagarComisionDto } from './dto';

@Controller('comisiones')
@UseGuards(JwtAuthGuard)
export class ComisionesController {
  constructor(private readonly comisiones: ComisionesService) {}

  @Get()
  resumen(@CurrentUser() user: AuthUser, @Query('despacho_id') despachoId?: string) {
    return this.comisiones.resumen(user, numero(despachoId));
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
