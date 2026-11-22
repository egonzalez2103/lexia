import { IsDateString, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateExpedienteDto {
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  titulo: string;

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  cliente: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  juzgado?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  materia?: string;
}

export class UpdateExpedienteDto extends CreateExpedienteDto {}

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
