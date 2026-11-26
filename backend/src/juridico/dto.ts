import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';
import { TIPOS_CATALOGO } from '../entities/catalogo-juridico.entity';

export class CatalogoJuridicoDto {
  @IsIn(TIPOS_CATALOGO)
  tipo: (typeof TIPOS_CATALOGO)[number];

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  nombre: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  detalle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  telefono?: string;
}

export class AutoridadDto {
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  nombre: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  materia_id?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  instancia_id?: number | null;
}

export class AsuntoDto {
  @IsInt()
  @Min(1)
  cliente_id: number;

  @IsString()
  @MinLength(2)
  @MaxLength(180)
  titulo: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notas?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  esquema?: string;

  @IsOptional()
  @IsString()
  @MaxLength(14)
  monto_acordado?: string;
}
