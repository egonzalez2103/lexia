import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthUser, CurrentUser, JwtAuthGuard } from '../common/auth';
import { CatalogoMovimientosService } from './catalogo-movimientos.service';
import { ActualizarTipoMovimientoDto, TipoMovimientoDto } from './dto';

@Controller('tipos-movimiento')
@UseGuards(JwtAuthGuard)
export class TiposMovimientoController {
  constructor(private readonly catalogo: CatalogoMovimientosService) {}

  @Get()
  listar(
    @CurrentUser() user: AuthUser,
    @Query('despacho_id') despachoId?: string,
    @Query('q') q?: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '50',
  ) {
    return this.catalogo.listarTipos(user, numero(despachoId), q, parseInt(page, 10) || 1, parseInt(pageSize, 10) || 50);
  }

  @Post()
  crear(@CurrentUser() user: AuthUser, @Body() dto: TipoMovimientoDto) {
    return this.catalogo.crearTipo(user, dto);
  }

  @Patch(':id')
  actualizar(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: ActualizarTipoMovimientoDto) {
    return this.catalogo.actualizarTipo(user, Number(id), dto);
  }
}

function numero(value?: string) {
  return value && /^\d+$/.test(value) ? Number(value) : undefined;
}
