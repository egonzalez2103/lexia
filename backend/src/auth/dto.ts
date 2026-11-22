import { IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(80)
  password: string;
}
