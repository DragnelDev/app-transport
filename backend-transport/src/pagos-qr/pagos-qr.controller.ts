import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser, Public } from '../common/decorators';
import { AuthUser } from '../common/interfaces/auth-user';
import { GenerarQrDto } from './dto/pagos-qr.dto';
import { PagosQrService } from './pagos-qr.service';

@Controller('pagos-qr')
@ApiTags('Pagos QR')
export class PagosQrController {
  constructor(private readonly service: PagosQrService) {}

  @Post()
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Generar solicitud de pago QR' })
  generar(@Body() dto: GenerarQrDto, @CurrentUser() user: AuthUser) {
    return this.service.generar(dto.monto, dto.glosa, user);
  }

  @Get(':id')
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Consultar pago QR' })
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.service.obtener(id);
  }

  /** Callback del banco / pasarela. Protegido con firma HMAC-SHA256 (x-signature). */
  @Public()
  @HttpCode(200)
  @Post('webhook')
  @ApiHeader({
    name: 'x-signature',
    description: 'Firma HMAC-SHA256 del proveedor de pagos',
    required: true,
  })
  @ApiOperation({ summary: 'Recibir notificación del proveedor de pagos' })
  webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-signature') firma: string | undefined,
    @Body() body: unknown,
  ) {
    return this.service.procesarWebhook(req.rawBody, firma, body);
  }

  @Post(':id/simular')
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Simular confirmación de pago (entorno de pruebas)',
  })
  simular(@Param('id', ParseIntPipe) id: number) {
    return this.service.simular(id);
  }
}
