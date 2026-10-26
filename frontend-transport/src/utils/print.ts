import QRCode from 'qrcode'
import type { Encomienda, Pasajero } from '@/api/types'
import { fechaHora, money } from './format'

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

/** Imprime un fragmento HTML en un iframe oculto con tamaño de papel térmico (58 u 80 mm). */
export function imprimirHtml(cuerpo: string, anchoMm = 80) {
  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'
  document.body.appendChild(iframe)
  const doc = iframe.contentDocument!
  doc.open()
  doc.write(`<!doctype html><html><head><meta charset="utf-8"><style>
    @page { size: ${anchoMm}mm auto; margin: 2mm; }
    body { width: ${anchoMm - 6}mm; margin: 0; font: 12px/1.35 'Courier New', monospace; color: #000; }
    h1 { font-size: 16px; text-align: center; margin: 2px 0; }
    h2 { font-size: 22px; text-align: center; margin: 4px 0; letter-spacing: 1px; }
    .c { text-align: center; } .r { display: flex; justify-content: space-between; gap: 6px; }
    hr { border: 0; border-top: 1px dashed #000; margin: 5px 0; }
    img { display: block; margin: 4px auto; width: 38mm; height: 38mm; } .b { font-weight: 700; }
    .big { font-size: 15px; font-weight: 700; text-align: center; }
  </style></head><body>${cuerpo}</body></html>`)
  doc.close()
  iframe.onload = () => {
    iframe.contentWindow?.focus()
    iframe.contentWindow?.print()
    setTimeout(() => iframe.remove(), 2000)
  }
}

export async function imprimirBoleto(p: Pasajero, anchoMm = 80) {
  const s = p.salida
  const qr = await QRCode.toDataURL(`PAS-${p.id}-${p.salidaId}-${p.numeroAsiento}`, { margin: 0, width: 220 })
  imprimirHtml(
    `<h1>BOLETO DE VIAJE</h1>
     <div class="c b">${esc(s?.ruta?.origen)} → ${esc(s?.ruta?.destino)}</div><hr>
     <div class="r"><span>Salida</span><span>${esc(fechaHora(s?.fechaHoraProgramada))}</span></div>
     <div class="r"><span>Placa</span><span>${esc(s?.camioneta?.placa)}</span></div>
     <h2>ASIENTO ${p.numeroAsiento}</h2>
     <div class="b">${esc(p.nombrePasajero)}</div>
     <div>CI: ${esc(p.documentoIdentidad)} · Tel: ${esc(p.telefono)}</div>
     ${p.paradaDestino ? `<div>Baja en: ${esc(p.paradaDestino)}</div>` : ''}<hr>
     <div class="r b"><span>TOTAL</span><span>${esc(money(p.montoPago))}</span></div>
     <div class="r"><span>Pago</span><span>${esc(p.metodoPago)}</span></div><hr>
     <img src="${qr}" alt="QR"><div class="c">Boleto #${p.id}</div>
     <div class="c">${esc(fechaHora(p.createdAt))}</div>`,
    anchoMm,
  )
}

export async function imprimirEtiqueta(e: Encomienda, anchoMm = 80) {
  const qr = await QRCode.toDataURL(e.codigoGuia, { margin: 0, width: 260 })
  imprimirHtml(
    `<h1>ENCOMIENDA</h1><h2>${esc(e.codigoGuia)}</h2>
     <img src="${qr}" alt="QR" style="width:44mm;height:44mm"><hr>
     <div><span class="b">De:</span> ${esc(e.remitenteNombre)}</div>
     <div><span class="b">Para:</span> ${esc(e.destinatarioNombre)}</div>
     <div>Tel: ${esc(e.destinatarioTelefono)}${e.destinatarioCi ? ` · CI ${esc(e.destinatarioCi)}` : ''}</div>
     <div><span class="b">Destino:</span> ${esc(e.oficinaDestino ?? '—')}</div>
     <div>Bultos: ${e.cantidadBultos}${e.pesoEstimado ? ` · ${e.pesoEstimado} kg` : ''}</div>
     <div>${esc(e.descripcion.slice(0, 80))}</div><hr>
     <div class="big">${e.pagado ? 'PAGADO' : `COBRAR ${esc(money(e.montoCobrado))}`}</div>
     <div class="c">${esc(fechaHora(e.createdAt))}</div>`,
    anchoMm,
  )
}
