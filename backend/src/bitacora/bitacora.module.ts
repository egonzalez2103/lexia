import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Aplicacion } from '../entities/aplicacion.entity';
import { BitacoraEdicion } from '../entities/bitacora-edicion.entity';
import { Despacho } from '../entities/despacho.entity';
import { GrupoPermiso } from '../entities/grupo-permiso.entity';
import { BitacoraController } from './bitacora.controller';
import { BitacoraService } from './bitacora.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([BitacoraEdicion, Despacho, Aplicacion, GrupoPermiso])],
  controllers: [BitacoraController],
  providers: [BitacoraService],
  exports: [BitacoraService],
})
export class BitacoraModule {}
