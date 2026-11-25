import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthUser, CurrentUser, JwtAuthGuard } from '../common/auth';
import { BajaRegistroMovimientoDto, RegistroMovimientoDto } from './dto';
import { RegistrosMovimientoService } from './registros-movimiento.service';

@Controller('registros-movimiento')
@UseGuards(JwtAuthGuard)
export class RegistrosMovimientoController {
  constructor(private readonly registros: RegistrosMovimientoService) {}

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
    @Query('tipo') tipo?: string,
    @Query('tipo_id') tipoId?: string,
    @Query('usuario_id') usuarioId?: string,
  ) {
    return this.registros.listar(
      user,
      numero(despachoId),
      q,
      parseInt(page, 10) || 1,
      parseInt(pageSize, 10) || 50,
      ambito === 'fuera' ? 'fuera' : 'operacion',
      desde,
      hasta,
      tipo === 'ingreso' || tipo === 'egreso' ? tipo : undefined,
      numero(tipoId),
      numero(usuarioId),
    );
  }

  @Post()
  crear(@CurrentUser() user: AuthUser, @Body() dto: RegistroMovimientoDto) {
    return this.registros.crear(user, dto);
  }

  @Delete(':id')
  eliminar(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: BajaRegistroMovimientoDto) {
    return this.registros.eliminar(user, Number(id), dto);
  }
}

function numero(value?: string) {
  return value && /^\d+$/.test(value) ? Number(value) : undefined;
}
