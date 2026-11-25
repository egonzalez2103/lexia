import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthUser, CurrentUser, JwtAuthGuard } from '../common/auth';
import { CatalogoMovimientosService } from './catalogo-movimientos.service';
import { ActualizarCuentaBancariaDto, CuentaBancariaDto } from './dto';

@Controller('cuentas-bancarias')
@UseGuards(JwtAuthGuard)
export class CuentasBancariasController {
  constructor(private readonly catalogo: CatalogoMovimientosService) {}

  @Get()
  listar(
    @CurrentUser() user: AuthUser,
    @Query('despacho_id') despachoId?: string,
    @Query('q') q?: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '50',
  ) {
    return this.catalogo.listarCuentas(user, numero(despachoId), q, parseInt(page, 10) || 1, parseInt(pageSize, 10) || 50);
  }

  @Post()
  crear(@CurrentUser() user: AuthUser, @Body() dto: CuentaBancariaDto) {
    return this.catalogo.crearCuenta(user, dto);
  }

  @Patch(':id')
  actualizar(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: ActualizarCuentaBancariaDto) {
    return this.catalogo.actualizarCuenta(user, Number(id), dto);
  }
}

function numero(value?: string) {
  return value && /^\d+$/.test(value) ? Number(value) : undefined;
}
