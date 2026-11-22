import { IsDateString, IsIn, IsNumber, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CreateMovimientoDto {
  @IsIn(['chica', 'general'])
  caja: string;

  @IsIn(['ingreso', 'egreso'])
  tipo: string;

  @IsString()
  @MinLength(2)
  @MaxLength(180)
  concepto: string;

  @IsNumber()
  @Min(0.01)
  monto: number;

  @IsDateString()
  fecha: string;
}

export class CreateCorteDto {
  @IsIn(['chica', 'general'])
  caja: string;

  @IsDateString()
  fecha: string;

  @IsNumber()
  @Min(0)
  saldo_contado: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notas?: string;
}
