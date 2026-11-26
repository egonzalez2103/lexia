import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthUser, CurrentUser, JwtAuthGuard } from '../common/auth';
import { ClientesService } from './clientes.service';
import { BajaClienteDto, ClienteDto } from './dto';

@Controller('clientes')
@UseGuards(JwtAuthGuard)
export class ClientesController {
  constructor(private readonly clientes: ClientesService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query('despacho_id') despachoId?: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.clientes.list(user, numero(despachoId), q, numero(page) ?? 1, numero(pageSize) ?? 50);
  }

  @Get(':id')
  one(@CurrentUser() user: AuthUser, @Param('id') id: string, @Query('despacho_id') despachoId?: string) {
    return this.clientes.one(user, Number(id), numero(despachoId));
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: ClienteDto) {
    return this.clientes.create(user, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: ClienteDto) {
    return this.clientes.update(user, Number(id), dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: BajaClienteDto) {
    return this.clientes.eliminar(user, Number(id), dto?.despacho_id);
  }
}

function numero(value?: string) {
  return value && /^\d+$/.test(value) ? Number(value) : undefined;
}
