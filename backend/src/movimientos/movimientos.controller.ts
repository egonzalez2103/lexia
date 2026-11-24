import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthUser, CurrentUser, JwtAuthGuard } from '../common/auth';
import { CorteDto, InicioDto, MovimientoDto, TransferenciaDto } from './dto';
import { MovimientosService } from './movimientos.service';

@Controller('movimientos')
@UseGuards(JwtAuthGuard)
export class MovimientosController {
  constructor(private readonly movimientos: MovimientosService) {}

  @Get()
  resumen(@CurrentUser() user: AuthUser, @Query('despacho_id') despachoId?: string, @Query('usuario_id') usuarioId?: string) {
    return this.movimientos.resumen(user, numero(despachoId), numero(usuarioId));
  }

  @Post('inicios')
  iniciar(@CurrentUser() user: AuthUser, @Body() dto: InicioDto) {
    return this.movimientos.iniciar(user, dto);
  }

  @Post('ingresos')
  ingresar(@CurrentUser() user: AuthUser, @Body() dto: MovimientoDto) {
    return this.movimientos.ingresar(user, dto);
  }

  @Post('egresos')
  egresar(@CurrentUser() user: AuthUser, @Body() dto: MovimientoDto) {
    return this.movimientos.egresar(user, dto);
  }

  @Post('transferencias')
  transferir(@CurrentUser() user: AuthUser, @Body() dto: TransferenciaDto) {
    return this.movimientos.transferir(user, dto);
  }

  @Post('transferencias/:id/aceptar')
  aceptar(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: CorteDto) {
    return this.movimientos.aceptar(user, Number(id), dto.despacho_id);
  }

  @Post('transferencias/:id/rechazar')
  rechazar(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: CorteDto) {
    return this.movimientos.rechazar(user, Number(id), dto.despacho_id);
  }

  @Post('cortes')
  cortar(@CurrentUser() user: AuthUser, @Body() dto: CorteDto) {
    return this.movimientos.cortar(user, dto);
  }
}

function numero(value?: string) {
  return value && /^\d+$/.test(value) ? Number(value) : undefined;
}
