import { IsDateString, IsIn, IsInt, IsOptional, IsString, Matches, MaxLength, Min, MinLength } from 'class-validator';
import { CLASIFICACIONES } from '../entities/documento-expediente.entity';

const FUNCIONES = ['abogado', 'pasante', 'caja', 'consulta'] as const;

export class AudienciaDto {
  @IsInt()
  @Min(1)
  expediente_id: number;

  @IsString()
  @MinLength(2)
  @MaxLength(180)
  titulo: string;

  @IsDateString()
  fecha: string;

  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/)
  hora?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  lugar?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notas?: string;
}

export class DocumentoDto {
  @IsInt()
  @Min(1)
  expediente_id: number;

  @IsString()
  @MinLength(2)
  @MaxLength(180)
  titulo: string;

  @IsIn(CLASIFICACIONES)
  clasificacion: (typeof CLASIFICACIONES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  archivo_url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notas?: string;
}

export class CargoDto {
  @IsInt()
  @Min(1)
  asunto_id: number;

  @IsString()
  @MinLength(2)
  @MaxLength(180)
  concepto: string;

  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/)
  monto: string;

  @IsOptional()
  @IsDateString()
  vence_el?: string;
}

export class AbonoDto {
  @IsInt()
  @Min(1)
  cliente_id: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  asunto_id?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  cargo_id?: number | null;

  @IsString()
  @MinLength(2)
  @MaxLength(180)
  concepto: string;

  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/)
  monto: string;

  @IsIn(['efectivo', 'transferencia', 'otro'])
  medio: 'efectivo' | 'transferencia' | 'otro';

  @IsDateString()
  fecha: string;
}

export class DepositoDto {
  @IsInt()
  @Min(1)
  cliente_id: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  asunto_id?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  cuenta_bancaria_id?: number | null;

  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/)
  monto: string;

  @IsDateString()
  fecha: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  referencia?: string;
}

export class RechazoDto {
  @IsString()
  @MinLength(2)
  @MaxLength(240)
  motivo: string;
}

export class EquipoDto {
  @IsOptional()
  @IsIn(FUNCIONES)
  funcion?: (typeof FUNCIONES)[number] | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  sede_id?: number | null;
}
