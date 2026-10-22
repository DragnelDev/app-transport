export interface GenerarQrParams {
  monto: number;
  glosa: string;
  referencia: string;
  expiraEnMinutos: number;
}

export interface QrGenerado {
  transaccionId: string;
  imagenBase64: string; // data:image/png;base64,...
  expiraAt: Date;
}

export interface WebhookParseado {
  transaccionId?: string;
  referencia?: string;
  pagado: boolean;
  monto?: number;
}

/** Contrato que debe cumplir cada pasarela / banco. */
export interface QrProvider {
  generar(p: GenerarQrParams): Promise<QrGenerado>;
  parsearWebhook(body: any): WebhookParseado;
}
