import { Body, Controller, Get, Headers, HttpCode, Param, ParseIntPipe, Post, Req } from '@nestjs/common';
import { CurrentUser, Public } from '../common/decorators';
import { AuthUser } from '../common/interfaces/auth-user';
import { GenerarQrDto } from './pagos-qr.dto';
import { PagosQrService } from './pagos-qr.service';

@Controller('pagos-qr')
export class PagosQrController {
  constructor(private readonly service: PagosQrService) {}

  @Post()
  generar(@Body() dto: GenerarQrDto, @CurrentUser() user: AuthUser) {
    return this.service.generar(dto.monto, dto.glosa, user);
  }

  @Get(':id')
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.service.obtener(id);
  }

  /** Callback del banco / pasarela. Protegido con firma HMAC-SHA256 (x-signature). */
  @Public()
  @HttpCode(200)
  @Post('webhook')
  webhook(@Req() req: any, @Headers('x-signature') firma: string | undefined, @Body() body: unknown) {
    return this.service.procesarWebhook(req.rawBody, firma, body);
  }

  @Post(':id/simular')
  simular(@Param('id', ParseIntPipe) id: number) {
    return this.service.simular(id);
  }
}
