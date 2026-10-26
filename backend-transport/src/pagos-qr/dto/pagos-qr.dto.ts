import {
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class GenerarQrDto {
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) monto: number;
  @IsOptional() @IsString() @MaxLength(200) glosa?: string;
}
