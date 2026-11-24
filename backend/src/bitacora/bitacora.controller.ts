import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthUser, CurrentUser, JwtAuthGuard } from '../common/auth';
import { BitacoraService, parseFecha } from './bitacora.service';

@Controller('bitacora-ediciones')
@UseGuards(JwtAuthGuard)
export class BitacoraController {
  constructor(private readonly bitacora: BitacoraService) {}

  @Get()
  listar(
    @CurrentUser() user: AuthUser,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
    @Query('q') q?: string,
    @Query('entidad') entidad?: string,
    @Query('usuario') usuario?: string,
    @Query('despacho_id') despachoId?: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    const desdeNorm = parseFecha('desde', desde);
    const hastaNorm = parseFecha('hasta', hasta);
    if (desdeNorm && hastaNorm && desdeNorm > hastaNorm) {
      throw new BadRequestException('La fecha inicial tiene que ser anterior o igual a la final.');
    }
    const despacho = despachoId?.trim();
    return this.bitacora.listar(user, {
      page: parseInt(page, 10) || 1,
      pageSize: parseInt(pageSize, 10) || 20,
      q: q?.trim() || undefined,
      entidad: entidad?.trim() || undefined,
      usuario: usuario?.trim() || undefined,
      despachoId: despacho && /^\d+$/.test(despacho) ? Number(despacho) : undefined,
      desde: desdeNorm,
      hasta: hastaNorm,
    });
  }
}
