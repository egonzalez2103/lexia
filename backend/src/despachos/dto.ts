import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { PALETA_IDS } from './paletas';

export class CreateDespachoDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name: string;

  @IsString()
  @MinLength(3)
  @MaxLength(40)
  slug: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  blurb?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  admin_name: string;

  @IsEmail()
  admin_email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(80)
  admin_password: string;
}

export class UpdateDespachoDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  blurb?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  logo_url?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  portada_url?: string | null;

  @IsOptional()
  @IsIn(PALETA_IDS, { message: 'Elige una combinación de colores.' })
  paleta?: string;
}

export class AparienciaDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  logo_url?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  portada_url?: string | null;

  @IsOptional()
  @IsIn(PALETA_IDS, { message: 'Elige una combinación de colores.' })
  paleta?: string;
}

export class CreateMiembroDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(80)
  password: string;
}
