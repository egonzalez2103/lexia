import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthUser, CurrentUser, JwtAuthGuard } from '../common/auth';
import { AsuntoDto, AutoridadDto, CatalogoJuridicoDto } from './dto';
import { JuridicoService } from './juridico.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class JuridicoController {
  constructor(private readonly juridico: JuridicoService) {}

  @Get('tablero')
  tablero(@CurrentUser() user: AuthUser) {
    return this.juridico.tablero(user);
  }

  @Get('catalogos-juridicos')
  catalogos(@CurrentUser() user: AuthUser, @Query('tipo') tipo?: string) {
    return this.juridico.catalogosDe(user, tipo);
  }

  @Post('catalogos-juridicos')
  crearCatalogo(@CurrentUser() user: AuthUser, @Body() dto: CatalogoJuridicoDto) {
    return this.juridico.crearCatalogo(user, dto);
  }

  @Patch('catalogos-juridicos/:id')
  editarCatalogo(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: CatalogoJuridicoDto) {
    return this.juridico.editarCatalogo(user, Number(id), dto);
  }

  @Delete('catalogos-juridicos/:id')
  quitarCatalogo(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.juridico.quitarCatalogo(user, Number(id));
  }

  @Get('autoridades')
  autoridades(@CurrentUser() user: AuthUser) {
    return this.juridico.autoridadesDe(user);
  }

  @Post('autoridades')
  crearAutoridad(@CurrentUser() user: AuthUser, @Body() dto: AutoridadDto) {
    return this.juridico.crearAutoridad(user, dto);
  }

  @Patch('autoridades/:id')
  editarAutoridad(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: AutoridadDto) {
    return this.juridico.editarAutoridad(user, Number(id), dto);
  }

  @Delete('autoridades/:id')
  quitarAutoridad(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.juridico.quitarAutoridad(user, Number(id));
  }

  @Get('asuntos')
  asuntos(@CurrentUser() user: AuthUser, @Query('cliente_id') clienteId?: string) {
    return this.juridico.asuntosDe(user, clienteId && /^\d+$/.test(clienteId) ? Number(clienteId) : undefined);
  }

  @Post('asuntos')
  crearAsunto(@CurrentUser() user: AuthUser, @Body() dto: AsuntoDto) {
    return this.juridico.crearAsunto(user, dto);
  }

  @Patch('asuntos/:id')
  editarAsunto(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: AsuntoDto) {
    return this.juridico.editarAsunto(user, Number(id), dto);
  }

  @Delete('asuntos/:id')
  quitarAsunto(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.juridico.quitarAsunto(user, Number(id));
  }
}
