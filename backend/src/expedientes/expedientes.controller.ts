import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthUser, CurrentUser, JwtAuthGuard } from '../common/auth';
import {
  CreateEscritoDto,
  CreateExpedienteDto,
  CreatePromocionDto,
  CreateTerminoDto,
  UpdateEscritoDto,
  UpdateExpedienteDto,
  UpdatePromocionDto,
  UpdateTerminoDto,
} from './dto';
import { ExpedientesService } from './expedientes.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class ExpedientesController {
  constructor(private readonly expedientes: ExpedientesService) {}

  @Get('expedientes')
  list(@CurrentUser() user: AuthUser, @Query('despacho_id') despachoId?: string) {
    return this.expedientes.list(user, despachoId ? Number(despachoId) : undefined);
  }

  @Post('expedientes')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateExpedienteDto) {
    return this.expedientes.create(user, dto);
  }

  @Get('expedientes/:id')
  one(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.expedientes.one(user, Number(id));
  }

  @Patch('expedientes/:id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateExpedienteDto) {
    return this.expedientes.update(user, Number(id), dto);
  }

  @Delete('expedientes/:id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.expedientes.remove(user, Number(id));
  }

  @Post('expedientes/:id/terminos')
  addTermino(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: CreateTerminoDto) {
    return this.expedientes.addTermino(user, Number(id), dto);
  }

  @Patch('terminos/:id')
  updateTermino(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateTerminoDto) {
    return this.expedientes.updateTermino(user, Number(id), dto);
  }

  @Delete('terminos/:id')
  removeTermino(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.expedientes.removeTermino(user, Number(id));
  }

  @Post('expedientes/:id/promociones')
  addPromocion(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: CreatePromocionDto) {
    return this.expedientes.addPromocion(user, Number(id), dto);
  }

  @Patch('promociones/:id')
  updatePromocion(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdatePromocionDto) {
    return this.expedientes.updatePromocion(user, Number(id), dto);
  }

  @Delete('promociones/:id')
  removePromocion(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.expedientes.removePromocion(user, Number(id));
  }

  @Post('expedientes/:id/escritos')
  addEscrito(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: CreateEscritoDto) {
    return this.expedientes.addEscrito(user, Number(id), dto);
  }

  @Patch('escritos/:id')
  updateEscrito(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateEscritoDto) {
    return this.expedientes.updateEscrito(user, Number(id), dto);
  }

  @Delete('escritos/:id')
  removeEscrito(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.expedientes.removeEscrito(user, Number(id));
  }
}
