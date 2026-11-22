import { IsBoolean, IsNumber, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class GrupoDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  nombre: string;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  descripcion: string;
}

export class PermisoDto {
  @IsNumber()
  aplicacion_id: number;

  @IsOptional()
  @IsBoolean()
  insertar?: boolean;

  @IsOptional()
  @IsBoolean()
  actualizar?: boolean;

  @IsOptional()
  @IsBoolean()
  eliminar?: boolean;
}
