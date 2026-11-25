import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, Matches, MaxLength, Min, MinLength } from 'class-validator';

export class CajaGeneralDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  despacho_id?: number;

  @IsIn(['ingreso', 'egreso'])
  tipo: 'ingreso' | 'egreso';

  @Type(() => Number)
  @IsNumber()
  usuario_id: number;

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

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  fecha?: string;
}

export class CuadreDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  despacho_id?: number;
}

export class BajaCajaGeneralDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  despacho_id?: number;

  @IsString()
  @MinLength(3)
  @MaxLength(255)
  motivo: string;
}
