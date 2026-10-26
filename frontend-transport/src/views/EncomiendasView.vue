<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppModal from '@/components/AppModal.vue'
import PageHeader from '@/components/PageHeader.vue'
import QrPaymentModal from '@/components/QrPaymentModal.vue'
import { errMsg, http } from '@/api/http'
import type { Encomienda, MetodoPago, Salida, TipoPagoEncomienda } from '@/api/types'
import { useToastStore } from '@/stores/toast'
import { clasesEstadoEntrega, fechaHora, hora, fechaCorta, money } from '@/utils/format'
import { imprimirEtiqueta } from '@/utils/print'

const toast = useToastStore()
const router = useRouter()

const items = ref<Encomienda[]>([])
const salidas = ref<Salida[]>([])
const q = ref('')
const estado = ref('')
const pendientePago = ref(false)

const modalNueva = ref(false)
const modalAsignar = ref<Encomienda | null>(null)
const salidaAsignar = ref<number | null>(null)
const qrPara = ref<null | { tipo: 'nueva' | 'cobro'; enc?: Encomienda }>(null)
const anchoPapel = Number(localStorage.getItem('anchoPapel')) === 58 ? 58 : 80

const vacio = () => ({
  remitenteNombre: '', remitenteCi: '', remitenteTelefono: '',
  destinatarioNombre: '', destinatarioCi: '', destinatarioTelefono: '',
  descripcion: '', cantidadBultos: 1, pesoEstimado: null as number | null, tipoEmpaque: '',
  oficinaDestino: '', salidaId: null as number | null, montoCobrado: 0,
  tipoPago: 'Pagado en Origen' as TipoPagoEncomienda, metodoPago: 'Efectivo' as MetodoPago,
})
const form = reactive(vacio())

async function cargar() {
  const { data } = await http.get<Encomienda[]>('/encomiendas', {
    params: { q: q.value || undefined, estado: estado.value || undefined, pendientePago: pendientePago.value || undefined },
  })
  items.value = data
}

let t: ReturnType<typeof setTimeout>
watch(q, () => { clearTimeout(t); t = setTimeout(cargar, 300) })
watch([estado, pendientePago], cargar)

async function cargarSalidas() {
  const { data } = await http.get<Salida[]>('/salidas/cola')
  const { data: enRuta } = await http.get<Salida[]>('/salidas', { params: { estado: 'En Trayecto' } })
  salidas.value = [...data, ...enRuta]
}

function abrirNueva() {
  Object.assign(form, vacio())
  modalNueva.value = true
}

function body() {
  return {
    remitenteNombre: form.remitenteNombre, remitenteCi: form.remitenteCi || undefined, remitenteTelefono: form.remitenteTelefono,
    destinatarioNombre: form.destinatarioNombre, destinatarioCi: form.destinatarioCi || undefined, destinatarioTelefono: form.destinatarioTelefono,
    descripcion: form.descripcion, cantidadBultos: form.cantidadBultos, pesoEstimado: form.pesoEstimado ?? undefined,
    tipoEmpaque: form.tipoEmpaque || undefined, oficinaDestino: form.oficinaDestino || undefined,
    salidaId: form.salidaId ?? undefined, montoCobrado: Number(form.montoCobrado), tipoPago: form.tipoPago,
    metodoPago: form.tipoPago === 'Pagado en Origen' ? form.metodoPago : undefined,
  }
}

function enviarNueva() {
  if (form.tipoPago === 'Pagado en Origen' && form.metodoPago === 'QR') qrPara.value = { tipo: 'nueva' }
  else void crear()
}

async function crear(pagoQrId?: number) {
  try {
    const { data } = await http.post<Encomienda>('/encomiendas', { ...body(), pagoQrId })
    toast.ok(`Encomienda registrada: ${data.codigoGuia}`)
    modalNueva.value = false
    await imprimirEtiqueta(data, anchoPapel)
    await cargar()
  } catch (e) {
    toast.error(errMsg(e))
  } finally {
    qrPara.value = null
  }
}

async function accion(url: string, ok: string, payload?: object) {
  try {
    await http.post(url, payload)
    toast.ok(ok)
    await cargar()
  } catch (e) {
    toast.error(errMsg(e))
  }
}

async function asignar() {
  if (!modalAsignar.value || !salidaAsignar.value) return
  await accion(`/encomiendas/${modalAsignar.value.id}/asignar-salida`, 'Encomienda asignada a la salida', { salidaId: salidaAsignar.value })
  modalAsignar.value = null
}

async function cobrar(e: Encomienda, metodoPago: MetodoPago) {
  if (metodoPago === 'QR') qrPara.value = { tipo: 'cobro', enc: e }
  else await accion(`/encomiendas/${e.id}/cobrar`, 'Cobro registrado', { metodoPago })
}

async function cobroQrConfirmado(pagoQrId: number) {
  const e = qrPara.value?.enc
  if (qrPara.value?.tipo === 'nueva') return crear(pagoQrId)
  if (e) await accion(`/encomiendas/${e.id}/cobrar`, 'Cobro QR registrado', { metodoPago: 'QR', pagoQrId })
  qrPara.value = null
}

onMounted(async () => { await Promise.all([cargar(), cargarSalidas()]) })
</script>

<template>
  <PageHeader title="Encomiendas y paquetería" subtitle="Recepción en origen, guías con QR y seguimiento">
    <input v-model="q" class="input !w-64" placeholder="Buscar guía, nombre, CI o teléfono…" />
    <select v-model="estado" class="input !w-auto">
      <option value="">Todos los estados</option>
      <option>En Oficina Origen</option><option>En Carga/Viaje</option><option>Listo en Oficina Destino</option><option>Entregado</option>
    </select>
    <label class="flex items-center gap-1.5 text-sm"><input v-model="pendientePago" type="checkbox" /> Pendientes de cobro</label>
    <button class="btn-primary" @click="abrirNueva">+ Nueva encomienda</button>
  </PageHeader>

  <div class="card overflow-x-auto">
    <table class="table-base">
      <thead><tr><th>Guía</th><th>Remitente → Destinatario</th><th>Contenido</th><th>Salida</th><th>Cobro</th><th>Estado</th><th></th></tr></thead>
      <tbody>
        <tr v-for="e in items" :key="e.id">
          <td class="whitespace-nowrap font-mono font-semibold">{{ e.codigoGuia }}<div class="text-[11px] font-sans font-normal text-slate-500">{{ fechaHora(e.createdAt) }}</div></td>
          <td>{{ e.remitenteNombre }} → <b>{{ e.destinatarioNombre }}</b><div class="text-xs text-slate-500">{{ e.destinatarioTelefono }} · {{ e.oficinaDestino ?? 'sin destino' }}</div></td>
          <td class="max-w-56 truncate" :title="e.descripcion">{{ e.cantidadBultos }}× {{ e.descripcion }}</td>
          <td class="text-xs">
            <template v-if="e.salida">{{ fechaCorta(e.salida.fechaHoraProgramada) }} {{ hora(e.salida.fechaHoraProgramada) }}<br />{{ e.salida.camioneta?.placa }}</template>
            <span v-else class="text-slate-400">sin asignar</span>
          </td>
          <td class="whitespace-nowrap">
            {{ money(e.montoCobrado) }}
            <span v-if="e.pagado" class="badge bg-emerald-100 text-emerald-700">Pagado · {{ e.metodoPago }}</span>
            <span v-else class="badge bg-red-100 text-red-700">Por cobrar</span>
          </td>
          <td><span :class="['badge whitespace-nowrap', clasesEstadoEntrega[e.estadoEntrega]]">{{ e.estadoEntrega }}</span></td>
          <td class="space-x-1 whitespace-nowrap text-right">
            <button class="btn-secondary btn-sm" title="Imprimir etiqueta" @click="imprimirEtiqueta(e, anchoPapel)">🖨</button>
            <button v-if="e.estadoEntrega === 'En Oficina Origen'" class="btn-secondary btn-sm" @click="salidaAsignar = e.salidaId; modalAsignar = e">🚐 Asignar</button>
            <button v-if="!e.pagado" class="btn-secondary btn-sm" @click="cobrar(e, 'Efectivo')">💵</button>
            <button v-if="!e.pagado" class="btn-secondary btn-sm" @click="cobrar(e, 'QR')">📱</button>
            <button v-if="e.estadoEntrega === 'En Carga/Viaje'" class="btn-primary btn-sm" @click="accion(`/encomiendas/${e.id}/marcar-listo`, 'Marcada como lista en destino')">Listo en destino</button>
            <button v-if="e.estadoEntrega === 'Listo en Oficina Destino'" class="btn-success btn-sm" @click="router.push({ path: '/entrega', query: { q: e.codigoGuia } })">📬 Entregar</button>
          </td>
        </tr>
        <tr v-if="!items.length"><td colspan="7" class="py-8 text-center text-slate-400">Sin encomiendas</td></tr>
      </tbody>
    </table>
  </div>

  <AppModal v-if="modalNueva" title="Nueva encomienda" width="max-w-3xl" @close="modalNueva = false">
    <form id="f-enc" class="grid gap-4 sm:grid-cols-2" @submit.prevent="enviarNueva">
      <fieldset class="space-y-3"><legend class="mb-1 font-semibold">Remitente</legend>
        <div><label class="label">Nombre</label><input v-model="form.remitenteNombre" class="input" required /></div>
        <div class="grid grid-cols-2 gap-2"><div><label class="label">CI</label><input v-model="form.remitenteCi" class="input" /></div><div><label class="label">Teléfono</label><input v-model="form.remitenteTelefono" class="input" required /></div></div>
      </fieldset>
      <fieldset class="space-y-3"><legend class="mb-1 font-semibold">Destinatario</legend>
        <div><label class="label">Nombre</label><input v-model="form.destinatarioNombre" class="input" required /></div>
        <div class="grid grid-cols-2 gap-2"><div><label class="label">CI</label><input v-model="form.destinatarioCi" class="input" /></div><div><label class="label">Teléfono (WhatsApp)</label><input v-model="form.destinatarioTelefono" class="input" required /></div></div>
      </fieldset>
      <div class="sm:col-span-2"><label class="label">Descripción del contenido</label><input v-model="form.descripcion" class="input" required /></div>
      <div class="grid grid-cols-3 gap-2 sm:col-span-2">
        <div><label class="label">Bultos</label><input v-model.number="form.cantidadBultos" type="number" min="1" class="input" required /></div>
        <div><label class="label">Peso aprox. (kg)</label><input v-model.number="form.pesoEstimado" type="number" min="0" step="0.1" class="input" /></div>
        <div><label class="label">Empaque</label><input v-model="form.tipoEmpaque" class="input" list="empaques" /><datalist id="empaques"><option>Caja</option><option>Bolsa</option><option>Sobre</option><option>Saco</option><option>Frágil</option></datalist></div>
      </div>
      <div><label class="label">Salida (opcional)</label>
        <select v-model="form.salidaId" class="input">
          <option :value="null">— Asignar después —</option>
          <option v-for="s in salidas" :key="s.id" :value="s.id">{{ fechaCorta(s.fechaHoraProgramada) }} {{ hora(s.fechaHoraProgramada) }} · {{ s.ruta?.origen }} → {{ s.ruta?.destino }} · {{ s.camioneta?.placa }}</option>
        </select>
      </div>
      <div><label class="label">Oficina de destino</label><input v-model="form.oficinaDestino" class="input" placeholder="Si hay salida, se toma de la ruta" /></div>
      <div class="grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-3 sm:col-span-2">
        <div><label class="label">Costo (Bs)</label><input v-model.number="form.montoCobrado" type="number" min="0" step="0.01" class="input" required /></div>
        <div><label class="label">Modalidad de cobro</label><select v-model="form.tipoPago" class="input"><option>Pagado en Origen</option><option>Pago Contra Entrega</option></select></div>
        <div v-if="form.tipoPago === 'Pagado en Origen'"><label class="label">Método</label><select v-model="form.metodoPago" class="input"><option>Efectivo</option><option>QR</option></select></div>
        <p v-else class="self-end text-xs text-amber-700">Se cobrará en destino antes de entregar.</p>
      </div>
    </form>
    <template #footer>
      <button class="btn-secondary" @click="modalNueva = false">Cancelar</button>
      <button class="btn-primary" form="f-enc">Registrar e imprimir etiqueta</button>
    </template>
  </AppModal>

  <AppModal v-if="modalAsignar" :title="`Asignar ${modalAsignar.codigoGuia} a una salida`" @close="modalAsignar = null">
    <select v-model="salidaAsignar" class="input">
      <option :value="null" disabled>Seleccione…</option>
      <option v-for="s in salidas" :key="s.id" :value="s.id">{{ fechaCorta(s.fechaHoraProgramada) }} {{ hora(s.fechaHoraProgramada) }} · {{ s.ruta?.origen }} → {{ s.ruta?.destino }} · {{ s.camioneta?.placa }} ({{ s.estado }})</option>
    </select>
    <template #footer><button class="btn-secondary" @click="modalAsignar = null">Cancelar</button><button class="btn-primary" :disabled="!salidaAsignar" @click="asignar">Asignar</button></template>
  </AppModal>

  <QrPaymentModal
    v-if="qrPara"
    :monto="qrPara.tipo === 'nueva' ? Number(form.montoCobrado) : qrPara.enc!.montoCobrado"
    :glosa="qrPara.enc ? `Encomienda ${qrPara.enc.codigoGuia}` : 'Encomienda'"
    @close="qrPara = null"
    @confirmado="cobroQrConfirmado"
  />
</template>
