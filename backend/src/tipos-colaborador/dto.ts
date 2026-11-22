import { IsNumber, IsOptional, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';

export class TipoColaboradorDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  descripcion: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsNumber()
  grupo_id?: number | null;
}
