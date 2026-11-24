import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthUser, CurrentUser, JwtAuthGuard } from '../common/auth';
import { ClientesService } from './clientes.service';
import { ClienteDto } from './dto';

@Controller('clientes')
@UseGuards(JwtAuthGuard)
export class ClientesController {
  constructor(private readonly clientes: ClientesService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query('despacho_id') despachoId?: string, @Query('q') q?: string) {
    return this.clientes.list(user, numero(despachoId), q);
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
}

function numero(value?: string) {
  return value && /^\d+$/.test(value) ? Number(value) : undefined;
}
