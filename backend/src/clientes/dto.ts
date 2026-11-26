import { IsBoolean, IsEmail, IsIn, IsNumber, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class ClienteDto {
  @IsOptional()
  @IsIn(['fisica', 'moral'])
  tipo?: 'fisica' | 'moral';

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  nombre: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  paterno?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  materno?: string;

  @IsOptional()
  @IsString()
  @MaxLength(13)
  rfc?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  domicilio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  telefono?: string;

  @IsOptional()
  @IsEmail()
  correo?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  fecha_nacimiento?: string;

  @IsOptional()
  @IsIn(['Masculino', 'Femenino', 'Otro'])
  genero?: 'Masculino' | 'Femenino' | 'Otro';

  @IsOptional()
  @IsString()
  @MaxLength(120)
  zona_residencia?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notas?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @IsOptional()
  @IsNumber()
  despacho_id?: number;
}

export class BajaClienteDto {
  @IsOptional()
  @IsNumber()
  despacho_id?: number;
}
