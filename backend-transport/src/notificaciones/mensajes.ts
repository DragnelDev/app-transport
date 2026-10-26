/** Plantillas de mensajes de WhatsApp. */
export const Mensajes = {
  encomiendaSalida: (e: {
    codigoGuia: string;
    destinatarioNombre: string;
    oficinaDestino: string | null;
  }) =>
    `📦 *Encomienda en camino*\nSu envío *${e.codigoGuia}* para ${e.destinatarioNombre} ya salió hacia ${e.oficinaDestino ?? 'destino'}.`,

  encomiendaLista: (e: {
    codigoGuia: string;
    destinatarioNombre: string;
    oficinaDestino: string | null;
    tipoPago: string;
    montoCobrado: number;
    pagado: boolean;
  }) =>
    `✅ *Paquete listo para retiro*\nHola ${e.destinatarioNombre}, su encomienda *${e.codigoGuia}* está disponible en la oficina ${e.oficinaDestino ?? 'de destino'}.` +
    (e.pagado
      ? ''
      : `\n💵 Monto a cancelar al recoger: Bs ${e.montoCobrado.toFixed(2)}.`) +
    `\nPresente su CI o el código QR de la guía.`,

  encomiendaEntregada: (e: {
    codigoGuia: string;
    destinatarioNombre: string;
  }) =>
    `📬 *Encomienda entregada*\nSu envío *${e.codigoGuia}* fue entregado a ${e.destinatarioNombre}. ¡Gracias por confiar en nosotros!`,

  pasajeConfirmacion: (p: {
    nombre: string;
    asiento: number;
    fecha: string;
    origen: string;
    destino: string;
    monto: number;
  }) =>
    `🎫 *Pasaje confirmado*\nPasajero: ${p.nombre}\nRuta: ${p.origen} → ${p.destino}\nSalida: ${p.fecha}\nAsiento: ${p.asiento}\nMonto: Bs ${p.monto.toFixed(2)}`,

  manifiesto: (m: {
    fecha: string;
    ruta: string;
    placa: string;
    pasajeros: string[];
    encomiendas: number;
  }) =>
    `🚐 *Manifiesto de viaje*\n${m.ruta}\nSalida: ${m.fecha}\nPlaca: ${m.placa}\n\n*Pasajeros (${m.pasajeros.length})*\n${m.pasajeros.join('\n') || '—'}\n\nEncomiendas: ${m.encomiendas}`,
};
