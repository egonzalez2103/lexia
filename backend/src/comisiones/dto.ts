import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';

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

export class GenerarCorteDto {
  @IsOptional()
  @IsNumber()
  despacho_id?: number;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'La fecha del corte no es válida.' })
  fecha: string;

  @IsOptional()
  @IsNumber({}, { message: 'El porcentaje no es válido.' })
  @Min(0, { message: 'El porcentaje no puede ser negativo.' })
  @Max(100, { message: 'El porcentaje no puede pasar de 100.' })
  porcentaje?: number;
}

export class PagarVariasDto {
  @IsOptional()
  @IsNumber()
  despacho_id?: number;

  @IsArray()
  @ArrayMinSize(1, { message: 'Selecciona al menos una comisión.' })
  @ArrayMaxSize(500)
  @IsInt({ each: true })
  @Min(1, { each: true })
  ids: number[];
}
