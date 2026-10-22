import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { MetodoPago, TipoPagoEncomienda } from '../common/enums';

export class CreateEncomiendaDto {
  @IsString() @MaxLength(100) remitenteNombre: string;
  @IsOptional() @IsString() @MaxLength(30) remitenteCi?: string;
  @IsString() @MaxLength(20) remitenteTelefono: string;
  @IsString() @MaxLength(100) destinatarioNombre: string;
  @IsOptional() @IsString() @MaxLength(30) destinatarioCi?: string;
  @IsString() @MaxLength(20) destinatarioTelefono: string;
  @IsString() descripcion: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(500) cantidadBultos?: number;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) pesoEstimado?: number;
  @IsOptional() @IsString() @MaxLength(50) tipoEmpaque?: string;
  @IsOptional() @IsString() @MaxLength(100) oficinaDestino?: string;
  @IsOptional() @IsInt() salidaId?: number;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) montoCobrado: number;
  @IsEnum(TipoPagoEncomienda) tipoPago: TipoPagoEncomienda;
  /** Obligatorio si tipoPago = "Pagado en Origen". */
  @IsOptional() @IsEnum(MetodoPago) metodoPago?: MetodoPago;
  @IsOptional() @IsInt() pagoQrId?: number;
}

export class ActualizarEncomiendaDto {
  @IsOptional() @IsString() @MaxLength(100) remitenteNombre?: string;
  @IsOptional() @IsString() @MaxLength(30) remitenteCi?: string;
  @IsOptional() @IsString() @MaxLength(20) remitenteTelefono?: string;
  @IsOptional() @IsString() @MaxLength(100) destinatarioNombre?: string;
  @IsOptional() @IsString() @MaxLength(30) destinatarioCi?: string;
  @IsOptional() @IsString() @MaxLength(20) destinatarioTelefono?: string;
  @IsOptional() @IsString() descripcion?: string;
  @IsOptional() @IsInt() @Min(1) cantidadBultos?: number;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) pesoEstimado?: number;
  @IsOptional() @IsString() @MaxLength(50) tipoEmpaque?: string;
  @IsOptional() @IsString() @MaxLength(100) oficinaDestino?: string;
}

export class AsignarSalidaDto {
  @IsInt() salidaId: number;
}

export class CobrarDto {
  @IsEnum(MetodoPago) metodoPago: MetodoPago;
  @IsOptional() @IsInt() pagoQrId?: number;
}

export class EntregarDto {
  /** Requerido solo si la encomienda es contra entrega y aún no se cobró. */
  @IsOptional() @IsEnum(MetodoPago) metodoPago?: MetodoPago;
  @IsOptional() @IsInt() pagoQrId?: number;
  @IsOptional() @IsString() @MaxLength(100) recibidoPorNombre?: string;
  @IsOptional() @IsString() @MaxLength(30) recibidoPorCi?: string;
}
