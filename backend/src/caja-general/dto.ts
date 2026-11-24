import { IsIn, IsNumber, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CajaGeneralDto {
  @IsOptional()
  @IsNumber()
  despacho_id?: number;

  @IsIn(['ingreso', 'egreso'])
  tipo: 'ingreso' | 'egreso';

  @IsString()
  @MinLength(2)
  @MaxLength(180)
  concepto: string;

  @IsNumber()
  @Min(0.01)
  monto: number;
}

export class CuadreDto {
  @IsOptional()
  @IsNumber()
  despacho_id?: number;
}
