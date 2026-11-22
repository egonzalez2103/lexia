import { IsIn, IsNumber, IsOptional, IsString, Matches, MaxLength, Min, MinLength } from 'class-validator';

const FORMAS = ['Efectivo', 'Transferencia', 'Deposito', 'Tarjeta'] as const;

export class CrearPagoNominaDto {
  @IsNumber()
  @Min(1)
  colaborador_id: number;

  @IsIn(FORMAS)
  forma_pago: (typeof FORMAS)[number];

  @IsNumber()
  @Min(0.01)
  monto: number;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  descripcion?: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  semana: string;
}

export class ArchivoSemanaDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  semana: string;

  @IsString()
  @MinLength(2)
  @MaxLength(500)
  archivo_url: string;
}

export class ReciboNominaDto extends ArchivoSemanaDto {
  @IsNumber()
  @Min(1)
  colaborador_id: number;
}
