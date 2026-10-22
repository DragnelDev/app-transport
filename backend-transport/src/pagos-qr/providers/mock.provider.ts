import { randomUUID } from 'crypto';
import * as QRCode from 'qrcode';
import { GenerarQrParams, QrGenerado, QrProvider, WebhookParseado } from './qr-provider';

/** Pasarela simulada para desarrollo y pruebas (no mueve dinero). */
export class MockQrProvider implements QrProvider {
  async generar(p: GenerarQrParams): Promise<QrGenerado> {
    const transaccionId = `MOCK-${randomUUID()}`;
    const imagenBase64 = await QRCode.toDataURL(
      JSON.stringify({ mock: true, tx: transaccionId, ref: p.referencia, monto: p.monto, glosa: p.glosa }),
      { margin: 1, width: 320 },
    );
    return { transaccionId, imagenBase64, expiraAt: new Date(Date.now() + p.expiraEnMinutos * 60_000) };
  }

  parsearWebhook(body: any): WebhookParseado {
    return {
      transaccionId: body?.transaccionId,
      referencia: body?.referencia,
      pagado: ['PAGADO', 'COMPLETADO', 'PAID'].includes(String(body?.estado ?? '').toUpperCase()),
      monto: body?.monto !== undefined ? Number(body.monto) : undefined,
    };
  }
}
