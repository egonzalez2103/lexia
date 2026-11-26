import { IsDateString, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateIf } from 'class-validator';
import { TIPOS_VINCULO } from '../entities/vinculo-expediente.entity';

export class CreateExpedienteDto {
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  titulo: string;

  @ValidateIf((dto: CreateExpedienteDto) => !dto.cliente_id && !dto.asunto_id)
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  cliente?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  cliente_id?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  asunto_id?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  numero?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2200)
  anio?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  autoridad_id?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  sede_id?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  jurisdiccion_id?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  materia_id?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  instancia_id?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  estatus_id?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  etapa?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  juzgado?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  materia?: string | null;
}

export class UpdateExpedienteDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  titulo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  cliente?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  cliente_id?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  asunto_id?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  numero?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2200)
  anio?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  autoridad_id?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  sede_id?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  jurisdiccion_id?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  materia_id?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  instancia_id?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  estatus_id?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  etapa?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  juzgado?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  materia?: string | null;
}

export class CreateParteDto {
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  nombre: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  caracter: string;
}

export class CreateVinculoDto {
  @IsInt()
  @Min(1)
  relacionado_id: number;

  @IsIn(TIPOS_VINCULO)
  tipo: (typeof TIPOS_VINCULO)[number];
}

export class CreateTerminoDto {
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  titulo: string;

  @IsDateString()
  vence_el: string;

  @IsOptional()
  @IsIn(['pendiente', 'cumplido'])
  estado?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notas?: string;
}

export class UpdateTerminoDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  titulo?: string;

  @IsOptional()
  @IsDateString()
  vence_el?: string;

  @IsOptional()
  @IsIn(['pendiente', 'cumplido'])
  estado?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notas?: string;
}

export class CreatePromocionDto {
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  titulo: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  juzgado?: string;

  @IsDateString()
  presentada_el: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notas?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  archivo_url?: string;
}

export class UpdatePromocionDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  titulo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  juzgado?: string;

  @IsOptional()
  @IsDateString()
  presentada_el?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notas?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  archivo_url?: string;
}

export class CreateEscritoDto {
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  titulo: string;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  cuerpo?: string;

  @IsOptional()
  @IsIn(['borrador', 'cerrado'])
  estado?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  archivo_url?: string;
}

export class UpdateEscritoDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  titulo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  cuerpo?: string;

  @IsOptional()
  @IsIn(['borrador', 'cerrado'])
  estado?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  archivo_url?: string;
}
