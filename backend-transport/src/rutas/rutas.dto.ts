import { IsArray, IsBoolean, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateRutaDto {
  @IsString() @MaxLength(100) origen: string;
  @IsString() @MaxLength(100) destino: string;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) tarifaBase: number;
  @IsOptional() @IsArray() @IsString({ each: true }) paradas?: string[];
}

export class UpdateRutaDto {
  @IsOptional() @IsString() @MaxLength(100) origen?: string;
  @IsOptional() @IsString() @MaxLength(100) destino?: string;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) tarifaBase?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) paradas?: string[];
  @IsOptional() @IsBoolean() activa?: boolean;
}
