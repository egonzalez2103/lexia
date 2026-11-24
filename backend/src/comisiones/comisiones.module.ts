import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Comision } from '../entities/comision.entity';
import { User } from '../entities/user.entity';
import { ComisionesController } from './comisiones.controller';
import { ComisionesService } from './comisiones.service';

@Module({
  imports: [TypeOrmModule.forFeature([Comision, User])],
  controllers: [ComisionesController],
  providers: [ComisionesService],
})
export class ComisionesModule {}