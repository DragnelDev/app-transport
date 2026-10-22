import * as QRCode from 'qrcode';
import { GenerarQrParams, QrGenerado, QrProvider, WebhookParseado } from './qr-provider';

/**
 * Adaptador HTTP genérico para pasarelas QR (Pago Simple, BNB, Banco Unión,
 * Banco Ganadero o un agregador autorizado).
 *
 * ⚠️ Cada entidad define su propio contrato. Ajuste ÚNICAMENTE los métodos
 * `generar` y `parsearWebhook` según la documentación de su proveedor.
 *
 * Contrato asumido:
 *   POST {PAYMENT_API_URL}/qr  (Authorization: Bearer {PAYMENT_API_KEY})
 *   body:  { monto, moneda, glosa, referencia, expiracion_minutos }
 *   resp:  { transaccion_id, qr_base64? | qr_data?, expira_en? }
 *   Webhook: { transaccion_id, referencia, estado: 'PAGADO', monto }
 */
export class HttpQrProvider implements QrProvider {
  constructor(private readonly baseUrl: string, private readonly apiKey: string) {}

  async generar(p: GenerarQrParams): Promise<QrGenerado> {
    const res = await fetch(`${this.baseUrl.replace(/\/$/, '')}/qr`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        monto: p.monto,
        moneda: 'BOB',
        glosa: p.glosa,
        referencia: p.referencia,
        expiracion_minutos: p.expiraEnMinutos,
      }),
    });
    if (!res.ok) throw new Error(`Pasarela QR respondió ${res.status}: ${await res.text()}`);
    const data: any = await res.json();

    let imagen: string = data.qr_base64 ?? data.imagen_qr ?? '';
    if (imagen && !imagen.startsWith('data:')) imagen = `data:image/png;base64,${imagen}`;
    if (!imagen && data.qr_data) imagen = await QRCode.toDataURL(String(data.qr_data), { margin: 1, width: 320 });
    if (!imagen) throw new Error('La pasarela no devolvió una imagen/dato de QR');

    return {
      transaccionId: String(data.transaccion_id ?? data.id),
      imagenBase64: imagen,
      expiraAt: data.expira_en ? new Date(data.expira_en) : new Date(Date.now() + p.expiraEnMinutos * 60_000),
    };
  }

  parsearWebhook(body: any): WebhookParseado {
    return {
      transaccionId: body?.transaccion_id ?? body?.transaccionId ?? body?.id,
      referencia: body?.referencia,
      pagado: ['PAGADO', 'COMPLETADO', 'PAID', 'APPROVED'].includes(String(body?.estado ?? '').toUpperCase()),
      monto: body?.monto !== undefined ? Number(body.monto) : undefined,
    };
  }
}
