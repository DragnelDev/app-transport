<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import AppModal from '@/components/AppModal.vue'
import PageHeader from '@/components/PageHeader.vue'
import { errMsg, http } from '@/api/http'
import type { CierreCaja, ResumenCaja, Usuario } from '@/api/types'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { fechaHora, money } from '@/utils/format'

const auth = useAuthStore()
const toast = useToastStore()

const usuarios = ref<Usuario[]>([])
const usuarioId = ref<number | null>(null)
const resumen = ref<ResumenCaja | null>(null)
const historial = ref<CierreCaja[]>([])
const contado = ref<number | null>(null)
const observaciones = ref('')
const detalle = ref<CierreCaja | null>(null)

function imprimirPagina() { window.print() }
const esPropia = () => !usuarioId.value || usuarioId.value === auth.user?.id

async function cargar() {
  const params = { usuarioId: usuarioId.value ?? undefined }
  const [r, h] = await Promise.all([http.get<ResumenCaja>('/caja/resumen', { params }), http.get<CierreCaja[]>('/caja/historial', { params })])
  resumen.value = r.data
  historial.value = h.data
}

async function cerrar() {
  if (!resumen.value) return
  const msg = `Se cerrará la caja con ${money(resumen.value.totalEfectivo)} en efectivo y ${money(resumen.value.totalQr)} por QR.\nLas transacciones quedarán congeladas. ¿Continuar?`
  if (!window.confirm(msg)) return
  try {
    const { data } = await http.post<CierreCaja>('/caja/cerrar', { efectivoContado: contado.value ?? undefined, observaciones: observaciones.value || undefined })
    toast.ok(`Caja cerrada (#${data.id})`)
    contado.value = null
    observaciones.value = ''
    await cargar()
    detalle.value = data
  } catch (e) {
    toast.error(errMsg(e))
  }
}

watch(usuarioId, cargar)
onMounted(async () => {
  if (auth.isAdmin) usuarios.value = (await http.get<Usuario[]>('/usuarios')).data
  await cargar()
})
</script>

<template>
  <PageHeader title="Arqueo y cierre de caja" subtitle="Ingresos desde su último cierre, diferenciando efectivo y QR">
    <select v-if="auth.isAdmin" v-model="usuarioId" class="input !w-auto">
      <option :value="null">Mi caja</option>
      <option v-for="u in usuarios" :key="u.id" :value="u.id">{{ u.nombreCompleto }}</option>
    </select>
  </PageHeader>

  <template v-if="resumen">
    <div class="mb-5 grid gap-4 md:grid-cols-3">
      <div class="card border-l-4 border-l-emerald-500 p-5">
        <p class="label">💵 Efectivo a entregar en cajón</p>
        <p class="text-3xl font-bold">{{ money(resumen.totalEfectivo) }}</p>
        <p class="text-xs text-slate-500">Pasajes {{ money(resumen.efectivoPasajes) }} · Encomiendas {{ money(resumen.efectivoEncomiendas) }}</p>
      </div>
      <div class="card border-l-4 border-l-brand-500 p-5">
        <p class="label">📱 Ingresado por QR (cuenta bancaria)</p>
        <p class="text-3xl font-bold">{{ money(resumen.totalQr) }}</p>
        <p class="text-xs text-slate-500">Pasajes {{ money(resumen.qrPasajes) }} · Encomiendas {{ money(resumen.qrEncomiendas) }}</p>
      </div>
      <div class="card border-l-4 border-l-slate-400 p-5">
        <p class="label">Total general</p>
        <p class="text-3xl font-bold">{{ money(resumen.totalGeneral) }}</p>
        <p class="text-xs text-slate-500">{{ resumen.cantidadPasajes }} pasajes · {{ resumen.cantidadEncomiendas }} encomiendas · {{ resumen.salidasConSobrecupo }} turnos con sobrecupo</p>
      </div>
    </div>

    <div class="mb-5 grid gap-5 xl:grid-cols-[2fr_1fr]">
      <div class="space-y-5">
        <div class="card overflow-x-auto">
          <div class="border-b border-slate-200 px-4 py-3 font-semibold">Desglose por salida</div>
          <table class="table-base">
            <thead><tr><th>Salida</th><th>Ruta</th><th>Placa</th><th>Pasajes</th><th>Efectivo</th><th>QR</th><th>Marcas</th></tr></thead>
            <tbody>
              <tr v-for="s in resumen.salidas" :key="s.salidaId">
                <td>{{ fechaHora(s.fecha) }}</td><td>{{ s.ruta }}</td><td>{{ s.placa }}</td><td>{{ s.pasajes }}</td>
                <td>{{ money(s.efectivo) }}</td><td>{{ money(s.qr) }}</td>
                <td class="space-x-1">
                  <span v-if="s.ejecutada" class="badge bg-emerald-100 text-emerald-700">ejecutada</span>
                  <span v-else class="badge bg-slate-100 text-slate-600">{{ s.estado }}</span>
                  <span v-if="s.sobrecupo" class="badge bg-purple-100 text-purple-700">sobrecupo{{ s.usoAsiento8 ? ' (asiento 8 vendido)' : '' }}</span>
                </td>
              </tr>
              <tr v-if="!resumen.salidas.length"><td colspan="7" class="py-5 text-center text-slate-400">Sin pasajes pendientes de cierre</td></tr>
            </tbody>
          </table>
        </div>
        <div class="card overflow-x-auto">
          <div class="border-b border-slate-200 px-4 py-3 font-semibold">Encomiendas cobradas</div>
          <table class="table-base">
            <thead><tr><th>Guía</th><th>Modalidad</th><th>Método</th><th>Monto</th><th>Cobrado</th></tr></thead>
            <tbody>
              <tr v-for="e in resumen.encomiendasDetalle" :key="e.id"><td class="font-mono">{{ e.codigoGuia }}</td><td>{{ e.tipoPago }}</td><td>{{ e.metodo }}</td><td>{{ money(e.monto) }}</td><td>{{ fechaHora(e.pagadoAt) }}</td></tr>
              <tr v-if="!resumen.encomiendasDetalle.length"><td colspan="5" class="py-5 text-center text-slate-400">Sin cobros de encomiendas pendientes</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <form v-if="esPropia()" class="card h-fit space-y-3 p-5" @submit.prevent="cerrar">
        <h3 class="font-semibold">Cerrar caja</h3>
        <p class="text-xs text-slate-500">Al cerrar, las transacciones incluidas se congelan y quedan estampadas con su usuario, fecha y hora.</p>
        <div><label class="label">Efectivo contado en cajón (opcional)</label><input v-model.number="contado" type="number" min="0" step="0.01" class="input" /></div>
        <p v-if="contado !== null && contado !== undefined && String(contado) !== ''" :class="['text-sm font-semibold', contado - resumen.totalEfectivo === 0 ? 'text-emerald-700' : 'text-red-600']">
          Diferencia: {{ money(contado - resumen.totalEfectivo) }}
        </p>
        <div><label class="label">Observaciones</label><textarea v-model="observaciones" rows="2" class="input"></textarea></div>
        <button class="btn-danger w-full" :disabled="!resumen.cantidadPasajes && !resumen.cantidadEncomiendas">🔒 Cerrar caja</button>
      </form>
    </div>

    <div class="card overflow-x-auto">
      <div class="border-b border-slate-200 px-4 py-3 font-semibold">Historial de cierres</div>
      <table class="table-base">
        <thead><tr><th>#</th><th>Fecha de cierre</th><th>Secretaria</th><th>Efectivo</th><th>QR</th><th>Total</th><th>Diferencia</th><th></th></tr></thead>
        <tbody>
          <tr v-for="c in historial" :key="c.id">
            <td>{{ c.id }}</td><td>{{ fechaHora(c.fechaCierre) }}</td><td>{{ c.usuario?.nombreCompleto }}</td>
            <td>{{ money(c.totalEfectivo) }}</td><td>{{ money(c.totalQr) }}</td><td class="font-semibold">{{ money(c.totalGeneral) }}</td>
            <td :class="c.diferencia && c.diferencia !== 0 ? 'text-red-600' : ''">{{ c.diferencia === null ? '—' : money(c.diferencia) }}</td>
            <td class="text-right"><button class="btn-secondary btn-sm" @click="detalle = c">Ver / imprimir</button></td>
          </tr>
          <tr v-if="!historial.length"><td colspan="8" class="py-5 text-center text-slate-400">Aún no hay cierres</td></tr>
        </tbody>
      </table>
    </div>
  </template>

  <AppModal v-if="detalle" :title="`Cierre de caja #${detalle.id}`" width="max-w-2xl" @close="detalle = null">
    <div id="reporte-caja" class="space-y-2 text-sm">
      <p><b>Cerrado:</b> {{ fechaHora(detalle.fechaCierre) }} · <b>Oficina:</b> {{ detalle.oficinaSucursal }}</p>
      <p><b>Secretaria:</b> {{ detalle.usuario?.nombreCompleto ?? auth.user?.nombreCompleto }}</p>
      <table class="table-base">
        <tbody>
          <tr><td>Efectivo pasajes</td><td class="text-right">{{ money(detalle.efectivoPasajes) }}</td></tr>
          <tr><td>Efectivo encomiendas</td><td class="text-right">{{ money(detalle.efectivoEncomiendas) }}</td></tr>
          <tr class="font-semibold"><td>Total efectivo</td><td class="text-right">{{ money(detalle.totalEfectivo) }}</td></tr>
          <tr><td>QR pasajes</td><td class="text-right">{{ money(detalle.qrPasajes) }}</td></tr>
          <tr><td>QR encomiendas</td><td class="text-right">{{ money(detalle.qrEncomiendas) }}</td></tr>
          <tr class="font-semibold"><td>Total QR</td><td class="text-right">{{ money(detalle.totalQr) }}</td></tr>
          <tr class="text-base font-bold"><td>TOTAL GENERAL</td><td class="text-right">{{ money(detalle.totalGeneral) }}</td></tr>
          <tr v-if="detalle.efectivoContado !== null"><td>Efectivo contado / diferencia</td><td class="text-right">{{ money(detalle.efectivoContado) }} / {{ money(detalle.diferencia) }}</td></tr>
        </tbody>
      </table>
      <p>{{ detalle.cantidadPasajes }} pasajes · {{ detalle.cantidadEncomiendas }} encomiendas · {{ detalle.detalle.salidasConSobrecupo ?? 0 }} turnos con sobrecupo</p>
      <p v-if="detalle.observaciones"><b>Obs.:</b> {{ detalle.observaciones }}</p>
      <div class="pt-10"><div class="mx-auto w-56 border-t border-slate-500 pt-1 text-center text-xs">Firma de la secretaria</div></div>
    </div>
    <template #footer><button class="btn-secondary" @click="detalle = null">Cerrar</button><button class="btn-primary" @click="imprimirPagina">🖨 Imprimir</button></template>
  </AppModal>
</template>
