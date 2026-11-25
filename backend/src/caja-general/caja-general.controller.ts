import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthUser, CurrentUser, JwtAuthGuard } from '../common/auth';
import { CajaGeneralService } from './caja-general.service';
import { BajaCajaGeneralDto, CajaGeneralDto, CuadreDto } from './dto';

@Controller('caja-general')
@UseGuards(JwtAuthGuard)
export class CajaGeneralController {
  constructor(private readonly caja: CajaGeneralService) {}

  @Get()
  listar(
    @CurrentUser() user: AuthUser,
    @Query('despacho_id') despachoId?: string,
    @Query('q') q?: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '50',
    @Query('ambito') ambito?: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
    @Query('fecha') fecha?: string,
    @Query('tipo') tipo?: string,
    @Query('forma_pago') formaPago?: string,
    @Query('tipo_id') tipoId?: string,
    @Query('usuario_id') usuarioId?: string,
  ) {
    return this.caja.listar(user, {
      despachoId: numero(despachoId),
      q,
      page: parseInt(page, 10) || 1,
      pageSize: parseInt(pageSize, 10) || 50,
      ambito: ambito === 'fuera' ? 'fuera' : 'operacion',
      desde,
      hasta,
      fecha,
      tipo: tipo === 'ingreso' || tipo === 'egreso' ? tipo : undefined,
      formaPago: forma(formaPago),
      tipoId: numero(tipoId),
      usuarioId: numero(usuarioId),
    });
  }

  @Post('movimientos')
  mover(@CurrentUser() user: AuthUser, @Body() dto: CajaGeneralDto) {
    return this.caja.mover(user, dto);
  }

  @Post('cuadres')
  cuadrar(@CurrentUser() user: AuthUser, @Body() dto: CuadreDto) {
    return this.caja.cuadrar(user, dto);
  }

  @Delete('movimientos/:id')
  eliminar(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: BajaCajaGeneralDto) {
    return this.caja.eliminar(user, Number(id), dto);
  }
}

function numero(value?: string) {
  return value && /^\d+$/.test(value) ? Number(value) : undefined;
}

function forma(value?: string) {
  return value === 'efectivo' || value === 'transferencia' || value === 'deposito' || value === 'tarjeta' ? value : undefined;
}
