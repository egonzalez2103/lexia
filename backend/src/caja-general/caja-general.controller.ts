import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AuthUser, CurrentUser, JwtAuthGuard } from '../common/auth';
import { CajaGeneralService } from './caja-general.service';
import { CajaGeneralDto, CuadreDto } from './dto';

@Controller('caja-general')
@UseGuards(JwtAuthGuard)
export class CajaGeneralController {
  constructor(private readonly caja: CajaGeneralService) {}

  @Get()
  resumen(@CurrentUser() user: AuthUser, @Query('despacho_id') despachoId?: string) {
    return this.caja.resumen(user, numero(despachoId));
  }

  @Post('movimientos')
  mover(@CurrentUser() user: AuthUser, @Body() dto: CajaGeneralDto) {
    return this.caja.mover(user, dto);
  }

  @Post('cuadres')
  cuadrar(@CurrentUser() user: AuthUser, @Body() dto: CuadreDto) {
    return this.caja.cuadrar(user, dto);
  }
}

function numero(value?: string) {
  return value && /^\d+$/.test(value) ? Number(value) : undefined;
}
