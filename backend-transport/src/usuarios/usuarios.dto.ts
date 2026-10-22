import { IsBoolean, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateUsuarioDto {
  @IsString() @MaxLength(100) nombreCompleto: string;
  @IsString() @MinLength(3) @MaxLength(50) usuario: string;
  @IsString() @MinLength(6) @MaxLength(100) password: string;
  @IsIn(['Secretaria', 'Administrador']) rol: 'Secretaria' | 'Administrador';
  @IsString() @MaxLength(100) oficinaSucursal: string;
}

export class UpdateUsuarioDto {
  @IsOptional() @IsString() @MaxLength(100) nombreCompleto?: string;
  @IsOptional() @IsString() @MinLength(6) @MaxLength(100) password?: string;
  @IsOptional() @IsIn(['Secretaria', 'Administrador']) rol?: 'Secretaria' | 'Administrador';
  @IsOptional() @IsString() @MaxLength(100) oficinaSucursal?: string;
  @IsOptional() @IsBoolean() activo?: boolean;
}
