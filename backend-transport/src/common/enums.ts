export enum EstadoSalida {
  Programado = 'Programado',
  EnTrayecto = 'En Trayecto',
  Finalizado = 'Finalizado',
  Cancelado = 'Cancelado',
}

export enum MetodoPago {
  Efectivo = 'Efectivo',
  QR = 'QR',
}

export enum TipoPagoEncomienda {
  Origen = 'Pagado en Origen',
  ContraEntrega = 'Pago Contra Entrega',
}

export enum EstadoEntrega {
  EnOrigen = 'En Oficina Origen',
  EnViaje = 'En Carga/Viaje',
  ListoDestino = 'Listo en Oficina Destino',
  Entregado = 'Entregado',
}

export enum EstadoPagoQr {
  Pendiente = 'Pendiente',
  Completado = 'Completado',
  Expirado = 'Expirado',
  Fallido = 'Fallido',
}

export enum TipoNotificacion {
  EncomiendaSalida = 'ENCOMIENDA_SALIDA',
  EncomiendaLista = 'ENCOMIENDA_LISTA',
  EncomiendaEntregada = 'ENCOMIENDA_ENTREGADA',
  PasajeConfirmacion = 'PASAJE_CONFIRMACION',
  Manifiesto = 'MANIFIESTO',
}
