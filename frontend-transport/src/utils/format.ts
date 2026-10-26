export const money = (n: number | null | undefined) =>
  `Bs ${Number(n ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export const fechaHora = (d: string | Date | null | undefined) =>
  d
    ? new Date(d).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' })
    : '—'

export const hora = (d: string | Date) =>
  new Date(d).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })

export const fechaCorta = (d: string | Date) =>
  new Date(d).toLocaleDateString('es-BO', { weekday: 'short', day: '2-digit', month: 'short' })

/** yyyy-mm-dd en hora local. */
export const hoyISO = () => {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 10)
}

/** Valor para <input type="datetime-local"> en hora local. */
export const toInputDateTime = (d: string | Date) => {
  const x = new Date(d)
  x.setMinutes(x.getMinutes() - x.getTimezoneOffset())
  return x.toISOString().slice(0, 16)
}

export const clasesEstadoSalida: Record<string, string> = {
  Programado: 'bg-blue-100 text-blue-800',
  'En Trayecto': 'bg-amber-100 text-amber-800',
  Finalizado: 'bg-emerald-100 text-emerald-800',
  Cancelado: 'bg-slate-200 text-slate-600',
}

export const clasesEstadoEntrega: Record<string, string> = {
  'En Oficina Origen': 'bg-slate-200 text-slate-700',
  'En Carga/Viaje': 'bg-amber-100 text-amber-800',
  'Listo en Oficina Destino': 'bg-blue-100 text-blue-800',
  Entregado: 'bg-emerald-100 text-emerald-800',
}
