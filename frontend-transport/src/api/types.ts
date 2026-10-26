export type Rol = 'Secretaria' | 'Administrador'
export type MetodoPago = 'Efectivo' | 'QR'
export type EstadoSalida = 'Programado' | 'En Trayecto' | 'Finalizado' | 'Cancelado'
export type TipoPagoEncomienda = 'Pagado en Origen' | 'Pago Contra Entrega'
export type EstadoEntrega =
  | 'En Oficina Origen'
  | 'En Carga/Viaje'
  | 'Listo en Oficina Destino'
  | 'Entregado'
export type EstadoPagoQr = 'Pendiente' | 'Completado' | 'Expirado' | 'Fallido'

export interface Usuario {
  id: number
  nombreCompleto: string
  usuario: string
  rol: Rol
  oficinaSucursal: string
  activo: boolean
  createdAt: string
}

export interface AuthUser {
  id: number
  usuario: string
  nombreCompleto: string
  rol: Rol
  oficinaSucursal: string
}

interface Audit {
  createdAt: string
  createdBy: number | null
  updatedAt: string
  updatedBy: number | null
  creador?: { nombreCompleto: string } | null
  modificador?: { nombreCompleto: string } | null
}

export interface Ruta extends Audit {
  id: number
  origen: string
  destino: string
  tarifaBase: number
  paradas: string[]
  activa: boolean
}

export interface Camioneta extends Audit {
  id: number
  placa: string
  marcaModelo: string
  capacidadEstandar: number
  permiteSobrecupo: boolean
  choferNombre: string
  choferTelefono: string | null
  activa: boolean
}

export interface Salida extends Audit {
  id: number
  camionetaId: number
  rutaId: number
  fechaHoraProgramada: string
  capacidadMaximaTurno: number
  estado: EstadoSalida
  camioneta?: Camioneta
  ruta?: Ruta
  ocupados?: number
  posicion?: number
}

export interface Pasajero extends Audit {
  id: number
  salidaId: number
  numeroAsiento: number
  nombrePasajero: string
  documentoIdentidad: string
  telefono: string
  paradaDestino: string | null
  montoPago: number
  metodoPago: MetodoPago
  pagoQrId: number | null
  cierreCajaId: number | null
  motivoAnulacion: string | null
  deletedAt: string | null
  salida?: Salida
}

export interface AsientosInfo {
  salida: Salida
  capacidad: number
  permiteSobrecupo: boolean
  tarifaBase: number
  paradas: string[]
  ocupados: { numero: number; pasajeroId: number; nombre: string; documento: string }[]
}

export interface Encomienda extends Audit {
  id: number
  codigoGuia: string
  salidaId: number | null
  remitenteNombre: string
  remitenteCi: string | null
  remitenteTelefono: string
  destinatarioNombre: string
  destinatarioCi: string | null
  destinatarioTelefono: string
  descripcion: string
  cantidadBultos: number
  pesoEstimado: number | null
  tipoEmpaque: string | null
  oficinaOrigen: string | null
  oficinaDestino: string | null
  montoCobrado: number
  tipoPago: TipoPagoEncomienda
  metodoPago: MetodoPago | null
  pagoQrId: number | null
  pagado: boolean
  pagadoAt: string | null
  cierreCajaId: number | null
  estadoEntrega: EstadoEntrega
  entregadoAt: string | null
  recibidoPorNombre: string | null
  recibidoPorCi: string | null
  salida?: Salida | null
}

export interface PagoQr {
  id: number
  referencia: string
  transaccionIdBanco: string | null
  imagenQrBase64: string
  monto: number
  estado: EstadoPagoQr
  fechaExpiracion: string
  fechaConfirmacion: string | null
  utilizado: boolean
}

export interface ResumenCaja {
  usuarioId?: number
  periodoDesde: string | null
  efectivoPasajes: number
  efectivoEncomiendas: number
  qrPasajes: number
  qrEncomiendas: number
  totalEfectivo: number
  totalQr: number
  totalGeneral: number
  cantidadPasajes: number
  cantidadEncomiendas: number
  salidasConSobrecupo: number
  salidas: {
    salidaId: number
    ruta: string
    fecha: string
    placa: string
    estado: EstadoSalida
    ejecutada: boolean
    sobrecupo: boolean
    usoAsiento8: boolean
    pasajes: number
    efectivo: number
    qr: number
  }[]
  encomiendasDetalle: {
    id: number
    codigoGuia: string
    monto: number
    metodo: MetodoPago | null
    tipoPago: TipoPagoEncomienda
    pagadoAt: string | null
  }[]
}

export interface CierreCaja {
  id: number
  usuarioId: number
  usuario?: Usuario
  oficinaSucursal: string
  periodoDesde: string | null
  fechaCierre: string
  efectivoPasajes: number
  efectivoEncomiendas: number
  qrPasajes: number
  qrEncomiendas: number
  totalEfectivo: number
  totalQr: number
  totalGeneral: number
  cantidadPasajes: number
  cantidadEncomiendas: number
  efectivoContado: number | null
  diferencia: number | null
  observaciones: string | null
  detalle: { salidas?: ResumenCaja['salidas']; encomiendas?: ResumenCaja['encomiendasDetalle']; salidasConSobrecupo?: number }
}

export interface Notificacion {
  id: number
  tipo: string
  telefono: string
  mensaje: string
  estado: 'Pendiente' | 'Enviado' | 'Fallido'
  intentos: number
  error: string | null
  createdAt: string
  sentAt: string | null
}

export interface DashboardData {
  salidasHoy: number
  programadas: number
  enTrayecto: number
  pasajesHoy: number
  encomiendas: { enTransito: number; listasParaRetiro: number; pendientesDeCobro: number }
  ingresosHoy: { efectivo: number; qr: number }
}
