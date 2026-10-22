import { IsBoolean, IsDateString, IsEnum, IsInt, IsOptional } from 'class-validator';
import { EstadoSalida } from '../common/enums';

export class CreateSalidaDto {
  @IsInt() camionetaId: number;
  @IsInt() rutaId: number;
  @IsDateString() fechaHoraProgramada: string;
  @IsOptional() @IsBoolean() habilitarSobrecupo?: boolean;
}

export class UpdateSalidaDto {
  @IsOptional() @IsInt() camionetaId?: number;
  @IsOptional() @IsInt() rutaId?: number;
  @IsOptional() @IsDateString() fechaHoraProgramada?: string;
  @IsOptional() @IsBoolean() habilitarSobrecupo?: boolean;
}

export class CambiarEstadoSalidaDto {
  @IsEnum(EstadoSalida) estado: EstadoSalida;
}
