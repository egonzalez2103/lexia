import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsNumber, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class TipoMovimientoDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  despacho_id?: number;

  @IsString()
  @MinLength(2)
  @MaxLength(180)
  nombre: string;

  @IsBoolean()
  afecta_operacion: boolean;

  @IsArray()
  @Type(() => Number)
  @IsNumber({}, { each: true })
  usuario_ids: number[];
}

export class ActualizarTipoMovimientoDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  despacho_id?: number;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  nombre?: string;

  @IsOptional()
  @IsBoolean()
  afecta_operacion?: boolean;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsNumber({}, { each: true })
  usuario_ids?: number[];
}

export class CuentaBancariaDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  despacho_id?: number;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  banco: string;

  @IsString()
  @MinLength(4)
  @MaxLength(20)
  numero: string;

  @IsString()
  @MinLength(18)
  @MaxLength(18)
  clabe: string;
}

export class ActualizarCuentaBancariaDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  despacho_id?: number;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  banco?: string;

  @IsOptional()
  @IsString()
  @MinLength(4)
  @MaxLength(20)
  numero?: string;

  @IsOptional()
  @IsString()
  @MinLength(18)
  @MaxLength(18)
  clabe?: string;

  @IsOptional()
  @IsBoolean()
  activa?: boolean;
}
