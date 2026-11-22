import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Despacho } from '../entities/despacho.entity';
import { User } from '../entities/user.entity';
import { DespachosController } from './despachos.controller';
import { DespachosService } from './despachos.service';

@Module({
  imports: [TypeOrmModule.forFeature([Despacho, User])],
  controllers: [DespachosController],
  providers: [DespachosService],
  exports: [DespachosService],
})
export class DespachosModule {}
