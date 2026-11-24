import { IsNumber, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class PagarComisionDto {
  @IsOptional()
  @IsNumber()
  despacho_id?: number;
}

export class ComisionDto {
  @IsOptional()
  @IsNumber()
  despacho_id?: number;

  @IsNumber()
  usuario_id: number;

  @IsString()
  @MinLength(2)
  @MaxLength(180)
  concepto: string;

  @IsNumber()
  @Min(0.01)
  monto: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notas?: string;
}
