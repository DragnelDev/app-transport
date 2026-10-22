import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CerrarCajaDto {
  /** Efectivo físico contado en el cajón (para calcular la diferencia). */
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) efectivoContado?: number;
  @IsOptional() @IsString() @MaxLength(500) observaciones?: string;
}
