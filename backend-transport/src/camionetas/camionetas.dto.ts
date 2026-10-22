import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCamionetaDto {
  @IsString() @MaxLength(20) placa: string;
  @IsString() @MaxLength(50) marcaModelo: string;
  @IsOptional() @IsBoolean() permiteSobrecupo?: boolean;
  @IsString() @MaxLength(100) choferNombre: string;
  @IsOptional() @IsString() @MaxLength(20) choferTelefono?: string;
}

export class UpdateCamionetaDto {
  @IsOptional() @IsString() @MaxLength(20) placa?: string;
  @IsOptional() @IsString() @MaxLength(50) marcaModelo?: string;
  @IsOptional() @IsBoolean() permiteSobrecupo?: boolean;
  @IsOptional() @IsString() @MaxLength(100) choferNombre?: string;
  @IsOptional() @IsString() @MaxLength(20) choferTelefono?: string;
  @IsOptional() @IsBoolean() activa?: boolean;
}
