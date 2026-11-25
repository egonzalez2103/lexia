import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class RegistroMovimientoDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  despacho_id?: number;

  @Type(() => Number)
  @IsNumber()
  usuario_id: number;

  @IsIn(['ingreso', 'egreso'])
  tipo: 'ingreso' | 'egreso';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  tipo_movimiento_id?: number;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  tipo_nombre?: string;

  @IsIn(['efectivo', 'transferencia', 'deposito', 'tarjeta'])
  forma_pago: 'efectivo' | 'transferencia' | 'deposito' | 'tarjeta';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  cuenta_bancaria_id?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  monto: number;

  @IsString()
  @MinLength(3)
  @MaxLength(255)
  descripcion: string;
}

export class BajaRegistroMovimientoDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  despacho_id?: number;

  @IsString()
  @MinLength(3)
  @MaxLength(255)
  motivo: string;
}
