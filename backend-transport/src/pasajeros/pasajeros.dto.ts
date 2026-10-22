import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { MetodoPago } from '../common/enums';

export class VenderPasajeDto {
  @IsInt() salidaId: number;
  @IsInt() @Min(1) @Max(8) numeroAsiento: number;
  @IsString() @MaxLength(100) nombrePasajero: string;
  @IsString() @MaxLength(30) documentoIdentidad: string;
  @IsString() @MaxLength(20) telefono: string;
  @IsOptional() @IsString() @MaxLength(100) paradaDestino?: string;
  /** Si se omite se usa la tarifa base de la ruta. */
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) montoPago?: number;
  @IsEnum(MetodoPago) metodoPago: MetodoPago;
  @IsOptional() @IsInt() pagoQrId?: number;
}

export class ActualizarPasajeroDto {
  @IsOptional() @IsInt() @Min(1) @Max(8) numeroAsiento?: number;
  @IsOptional() @IsString() @MaxLength(100) nombrePasajero?: string;
  @IsOptional() @IsString() @MaxLength(30) documentoIdentidad?: string;
  @IsOptional() @IsString() @MaxLength(20) telefono?: string;
  @IsOptional() @IsString() @MaxLength(100) paradaDestino?: string;
}

export class AnularPasajeDto {
  @IsOptional() @IsString() @MaxLength(200) motivo?: string;
}
