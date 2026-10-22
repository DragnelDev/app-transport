import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Cliente de mensajería. WHATSAPP_PROVIDER = log | meta | evolution
 *  - log:       solo escribe en consola (desarrollo)
 *  - meta:      WhatsApp Business Cloud API (Graph API)
 *  - evolution: Evolution API autoalojada
 */
@Injectable()
export class WhatsappProvider {
  private readonly logger = new Logger(WhatsappProvider.name);

  constructor(private readonly cfg: ConfigService) {}

  async enviar(telefono: string, mensaje: string): Promise<void> {
    const proveedor = this.cfg.get<string>('WHATSAPP_PROVIDER') ?? 'log';

    if (proveedor === 'meta') {
      const phoneId = this.cfg.getOrThrow<string>('WHATSAPP_META_PHONE_ID');
      const token = this.cfg.getOrThrow<string>('WHATSAPP_META_TOKEN');
      const version = this.cfg.get<string>('WHATSAPP_META_VERSION') ?? 'v20.0';
      const res = await fetch(`https://graph.facebook.com/${version}/${phoneId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: telefono,
          type: 'text',
          text: { preview_url: false, body: mensaje },
        }),
      });
      if (!res.ok) throw new Error(`Meta API ${res.status}: ${await res.text()}`);
      return;
    }

    if (proveedor === 'evolution') {
      const url = this.cfg.getOrThrow<string>('WHATSAPP_EVOLUTION_URL').replace(/\/$/, '');
      const instancia = this.cfg.getOrThrow<string>('WHATSAPP_EVOLUTION_INSTANCE');
      const apikey = this.cfg.getOrThrow<string>('WHATSAPP_EVOLUTION_APIKEY');
      const res = await fetch(`${url}/message/sendText/${instancia}`, {
        method: 'POST',
        headers: { apikey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ number: telefono, text: mensaje }),
      });
      if (!res.ok) throw new Error(`Evolution API ${res.status}: ${await res.text()}`);
      return;
    }

    this.logger.log(`[WhatsApp simulado] → ${telefono}: ${mensaje.replace(/\n/g, ' | ')}`);
  }
}
