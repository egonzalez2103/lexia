import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class AccesoColaboradorDto {
  @IsBoolean()
  tiene_acceso: boolean;

  @IsOptional()
  @IsEmail()
  correo?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(80)
  password?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  telefono?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @IsOptional()
  @IsNumber()
  grupo_id?: number;
}

export class CreateColaboradorDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  nombre: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  paterno: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  materno?: string;

  @IsNumber()
  tipo_id: number;

  @IsOptional()
  @IsEmail()
  correo?: string;

  @IsNumber()
  @Min(0)
  salario_semanal: number;

  @IsOptional()
  @IsBoolean()
  tiene_nomina?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => AccesoColaboradorDto)
  acceso?: AccesoColaboradorDto;
}

export class UpdateColaboradorDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  paterno?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  materno?: string;

  @IsOptional()
  @IsNumber()
  tipo_id?: number;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  correo?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  salario_semanal?: number;

  @IsOptional()
  @IsBoolean()
  tiene_nomina?: boolean;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => AccesoColaboradorDto)
  acceso?: AccesoColaboradorDto;
}
