import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsString() usuario: string;
  @IsString() password: string;
}

export class CambiarPasswordDto {
  @IsString() actual: string;
  @IsString() @MinLength(6) nueva: string;
}
