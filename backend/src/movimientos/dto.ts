import { IsNumber, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class MovimientoDto {
  @IsOptional()
  @IsNumber()
  despacho_id?: number;

  @IsOptional()
  @IsNumber()
  usuario_id?: number;

  @IsString()
  @MinLength(2)
  @MaxLength(180)
  concepto: string;

  @IsNumber()
  @Min(0.01)
  monto: number;

  @IsOptional()
  @IsNumber()
  cliente_id?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notas?: string;
}

export class InicioDto {
  @IsOptional()
  @IsNumber()
  despacho_id?: number;

  @IsNumber()
  usuario_id: number;

  @IsNumber()
  @Min(0.01)
  monto: number;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  concepto?: string;
}

export class TransferenciaDto {
  @IsOptional()
  @IsNumber()
  despacho_id?: number;

  @IsOptional()
  @IsNumber()
  usuario_id?: number;

  @IsNumber()
  contraparte_usuario_id: number;

  @IsNumber()
  @Min(0.01)
  monto: number;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  concepto?: string;
}

export class CorteDto {
  @IsOptional()
  @IsNumber()
  despacho_id?: number;

  @IsOptional()
  @IsNumber()
  usuario_id?: number;
}

export class AlcanceDto {
  @IsOptional()
  @IsNumber()
  despacho_id?: number;

  @IsOptional()
  @IsNumber()
  usuario_id?: number;
}
