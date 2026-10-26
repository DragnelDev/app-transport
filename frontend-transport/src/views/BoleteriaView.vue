<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import QrPaymentModal from '@/components/QrPaymentModal.vue'
import SeatMap from '@/components/SeatMap.vue'
import { abrirBlob, errMsg, http } from '@/api/http'
import { onSocket } from '@/api/socket'
import type { AsientosInfo, MetodoPago, Pasajero, Salida } from '@/api/types'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { fechaCorta, hora, money } from '@/utils/format'
import { imprimirBoleto } from '@/utils/print'

const auth = useAuthStore()
const toast = useToastStore()
const route = useRoute()

const cola = ref<Salida[]>([])
const todasOficinas = ref(false)
const salidaId = ref<number | null>(null)
const info = ref<AsientosInfo | null>(null)
const pasajeros = ref<Pasajero[]>([])
const asiento = ref<number | null>(null)
const mostrarQr = ref(false)
const enviando = ref(false)
const anchoPapel = ref<58 | 80>(Number(localStorage.getItem('anchoPapel')) === 58 ? 58 : 80)

const form = reactive({
  nombrePasajero: '', documentoIdentidad: '', telefono: '', paradaDestino: '',
  montoPago: 0, metodoPago: 'Efectivo' as MetodoPago,
})

const salidaActual = computed(() => info.value?.salida)
const libres = computed(() => (info.value ? info.value.capacidad - info.value.ocupados.length : 0))

async function cargarCola() {
  const { data } = await http.get<Salida[]>('/salidas/cola', {
    params: { oficina: todasOficinas.value ? undefined : auth.user?.oficinaSucursal },
  })
  cola.value = data
  if (!salidaId.value && data[0]) salidaId.value = data[0].id
}

async function cargarSalida() {
  if (!salidaId.value) { info.value = null; pasajeros.value = []; return }
  try {
    const [a, p] = await Promise.all([
      http.get<AsientosInfo>(`/salidas/${salidaId.value}/asientos`),
      http.get<Pasajero[]>('/pasajeros', { params: { salidaId: salidaId.value } }),
    ])
    info.value = a.data
    pasajeros.value = p.data.sort((x, y) => x.numeroAsiento - y.numeroAsiento)
    if (asiento.value && a.data.ocupados.some((o) => o.numero === asiento.value)) asiento.value = null
    if (!form.montoPago) form.montoPago = a.data.tarifaBase
  } catch (e) {
    toast.error(errMsg(e))
  }
}

function seleccionarSalida(id: number) {
  salidaId.value = id
  asiento.value = null
  form.montoPago = 0
}

async function toggleSobrecupo() {
  if (!info.value) return
  try {
    await http.patch(`/salidas/${salidaId.value}`, { habilitarSobrecupo: info.value.capacidad !== 8 })
    toast.ok(info.value.capacidad === 8 ? 'Asiento 8 deshabilitado' : 'Asiento 8 habilitado por alta demanda')
    asiento.value = null
    await Promise.all([cargarSalida(), cargarCola()])
  } catch (e) {
    toast.error(errMsg(e))
  }
}

function limpiarForm() {
  Object.assign(form, { nombrePasajero: '', documentoIdentidad: '', telefono: '', paradaDestino: '', metodoPago: 'Efectivo' })
  form.montoPago = info.value?.tarifaBase ?? 0
  asiento.value = null
}

async function registrarVenta(pagoQrId?: number) {
  enviando.value = true
  try {
    const { data } = await http.post<Pasajero>('/pasajeros', {
      salidaId: salidaId.value,
      numeroAsiento: asiento.value,
      nombrePasajero: form.nombrePasajero,
      documentoIdentidad: form.documentoIdentidad,
      telefono: form.telefono,
      paradaDestino: form.paradaDestino || undefined,
      montoPago: Number(form.montoPago),
      metodoPago: form.metodoPago,
      pagoQrId,
    })
    toast.ok(`Pasaje vendido · asiento ${data.numeroAsiento}`)
    await imprimirBoleto(data, anchoPapel.value)
    limpiarForm()
    await Promise.all([cargarSalida(), cargarCola()])
  } catch (e) {
    toast.error(errMsg(e))
    await cargarSalida()
  } finally {
    enviando.value = false
    mostrarQr.value = false
  }
}

function cobrar() {
  if (!asiento.value) return toast.error('Seleccione un asiento en el mapa')
  if (form.metodoPago === 'QR') mostrarQr.value = true
  else void registrarVenta()
}

async function anular(p: Pasajero) {
  const motivo = window.prompt(`Anular el boleto de ${p.nombrePasajero} (asiento ${p.numeroAsiento}).\nMotivo:`)
  if (motivo === null) return
  try {
    await http.delete(`/pasajeros/${p.id}`, { data: { motivo } })
    toast.ok('Boleto anulado')
    await Promise.all([cargarSalida(), cargarCola()])
  } catch (e) {
    toast.error(errMsg(e))
  }
}

async function mover(p: Pasajero) {
  const n = Number(window.prompt(`Nuevo asiento para ${p.nombrePasajero} (actual ${p.numeroAsiento}):`))
  if (!n) return
  try {
    await http.patch(`/pasajeros/${p.id}`, { numeroAsiento: n })
    toast.ok('Asiento actualizado')
    await cargarSalida()
  } catch (e) {
    toast.error(errMsg(e))
  }
}

const reimprimir = (p: Pasajero) => imprimirBoleto(p, anchoPapel.value)

async function whatsappChofer() {
  try {
    await http.post(`/salidas/${salidaId.value}/manifiesto/whatsapp`)
    toast.ok('Manifiesto enviado a la cola de WhatsApp del conductor')
  } catch (e) {
    toast.error(errMsg(e))
  }
}

watch(salidaId, cargarSalida)
watch(todasOficinas, cargarCola)
watch(anchoPapel, (v) => localStorage.setItem('anchoPapel', String(v)))

let off: (() => void) | undefined
onMounted(async () => {
  const q = Number(route.query.salida)
  if (q) salidaId.value = q
  await cargarCola()
  if (q) await cargarSalida()
  // Cuando otra operadora vende/anula, el mapa se actualiza solo (evita sobreventa)
  off = onSocket<{ salidaId: number }>('salida:asientos', (e) => {
    if (e.salidaId === salidaId.value) void cargarSalida()
    void cargarCola()
  })
})
onUnmounted(() => off?.())
</script>

<template>
  <PageHeader title="Boletería" subtitle="Venta de pasajes con mapa interactivo de asientos">
    <label class="flex items-center gap-2 text-sm text-slate-600">
      Papel
      <select v-model.number="anchoPapel" class="input !w-auto !py-1"><option :value="58">58 mm</option><option :value="80">80 mm</option></select>
    </label>
  </PageHeader>

  <div class="grid gap-5 xl:grid-cols-[300px_1fr_380px]">
    <!-- Cola de turnos -->
    <div class="card">
      <div class="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <span class="font-semibold">Cola de turnos</span>
        <label class="flex items-center gap-1 text-xs text-slate-500"><input v-model="todasOficinas" type="checkbox" /> Todas</label>
      </div>
      <ul class="max-h-[70vh] divide-y divide-slate-100 overflow-y-auto">
        <li v-for="s in cola" :key="s.id">
          <button :class="['w-full px-4 py-3 text-left hover:bg-slate-50', salidaId === s.id && 'bg-brand-50']" @click="seleccionarSalida(s.id)">
            <div class="flex items-center justify-between">
              <span class="font-semibold">{{ hora(s.fechaHoraProgramada) }} <span class="text-xs font-normal text-slate-500">{{ fechaCorta(s.fechaHoraProgramada) }}</span></span>
              <span class="text-xs text-slate-500">#{{ s.posicion }}</span>
            </div>
            <div class="text-sm">{{ s.ruta?.origen }} → {{ s.ruta?.destino }}</div>
            <div class="mt-1 flex items-center gap-2 text-xs text-slate-500">
              {{ s.camioneta?.placa }} · {{ s.ocupados }}/{{ s.capacidadMaximaTurno }}
              <span v-if="s.capacidadMaximaTurno === 8" class="badge bg-purple-100 text-purple-700">sobrecupo</span>
            </div>
          </button>
        </li>
        <li v-if="!cola.length" class="px-4 py-8 text-center text-sm text-slate-400">No hay turnos programados. Cree uno en «Turnos y salidas».</li>
      </ul>
    </div>

    <!-- Mapa de asientos -->
    <div class="space-y-5">
      <div v-if="info && salidaActual" class="card p-5">
        <div class="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 class="text-lg font-semibold">{{ salidaActual.ruta?.origen }} → {{ salidaActual.ruta?.destino }}</h2>
            <p class="text-sm text-slate-500">
              {{ fechaCorta(salidaActual.fechaHoraProgramada) }} {{ hora(salidaActual.fechaHoraProgramada) }} ·
              {{ salidaActual.camioneta?.marcaModelo }} {{ salidaActual.camioneta?.placa }} · Chofer {{ salidaActual.camioneta?.choferNombre }}
            </p>
            <p class="mt-1 text-sm"><b>{{ libres }}</b> libres de {{ info.capacidad }} · tarifa {{ money(info.tarifaBase) }}</p>
          </div>
          <div class="flex flex-col items-end gap-2">
            <label v-if="info.permiteSobrecupo" class="flex cursor-pointer items-center gap-2 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-sm">
              <input type="checkbox" :checked="info.capacidad === 8" @change="toggleSobrecupo" />
              Habilitar asiento 8 (medio delantero)
            </label>
            <div class="flex gap-2">
              <button class="btn-secondary btn-sm" @click="abrirBlob(`/salidas/${salidaActual.id}/manifiesto`)">📄 Manifiesto PDF</button>
              <button class="btn-secondary btn-sm" @click="whatsappChofer">💬 Enviar al chofer</button>
            </div>
          </div>
        </div>
        <SeatMap :info="info" :seleccionado="asiento" @seleccionar="(n) => (asiento = n)" />
      </div>
      <div v-else class="card p-10 text-center text-slate-400">Seleccione un turno de la cola</div>

      <div v-if="pasajeros.length" class="card">
        <div class="border-b border-slate-200 px-4 py-3 font-semibold">Pasajeros del turno ({{ pasajeros.length }})</div>
        <table class="table-base">
          <thead><tr><th>Asiento</th><th>Pasajero</th><th>CI</th><th>Teléfono</th><th>Baja en</th><th>Pago</th><th></th></tr></thead>
          <tbody>
            <tr v-for="p in pasajeros" :key="p.id">
              <td class="font-bold">{{ p.numeroAsiento }}</td>
              <td>{{ p.nombrePasajero }}</td>
              <td>{{ p.documentoIdentidad }}</td>
              <td>{{ p.telefono }}</td>
              <td>{{ p.paradaDestino ?? '—' }}</td>
              <td>{{ money(p.montoPago) }} <span class="badge bg-slate-100 text-slate-600">{{ p.metodoPago }}</span></td>
              <td class="space-x-1 whitespace-nowrap text-right">
                <button class="btn-secondary btn-sm" @click="reimprimir(p)">🖨</button>
                <button class="btn-secondary btn-sm" :disabled="!!p.cierreCajaId" @click="mover(p)">Mover</button>
                <button class="btn-danger btn-sm" :disabled="!!p.cierreCajaId" @click="anular(p)">Anular</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Formulario de venta -->
    <form class="card h-fit space-y-3 p-5" @submit.prevent="cobrar">
      <h3 class="text-lg font-semibold">Datos del pasajero</h3>
      <div class="rounded-lg bg-slate-50 px-3 py-2 text-sm">
        Asiento: <b class="text-lg" :class="asiento ? 'text-brand-700' : 'text-slate-400'">{{ asiento ?? '—' }}</b>
        <span v-if="asiento === 8" class="badge ml-2 bg-purple-100 text-purple-700">medio delantero</span>
      </div>
      <div><label class="label">Nombre completo</label><input v-model="form.nombrePasajero" class="input" required maxlength="100" /></div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="label">CI</label><input v-model="form.documentoIdentidad" class="input" required maxlength="30" /></div>
        <div><label class="label">Teléfono</label><input v-model="form.telefono" class="input" required maxlength="20" inputmode="tel" /></div>
      </div>
      <div>
        <label class="label">Parada / destino de bajada</label>
        <input v-model="form.paradaDestino" class="input" list="paradas" maxlength="100" />
        <datalist id="paradas">
          <option v-for="p in info?.paradas ?? []" :key="p" :value="p" />
          <option v-if="salidaActual" :value="salidaActual.ruta?.destino" />
        </datalist>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="label">Monto (Bs)</label><input v-model.number="form.montoPago" type="number" step="0.01" min="0" class="input" required /></div>
        <div>
          <label class="label">Método de pago</label>
          <select v-model="form.metodoPago" class="input"><option>Efectivo</option><option>QR</option></select>
        </div>
      </div>
      <button class="btn-primary w-full !py-3 text-base" :disabled="!salidaId || !asiento || enviando">
        {{ form.metodoPago === 'QR' ? '📱 Generar QR y cobrar' : '💵 Cobrar e imprimir boleto' }}
      </button>
    </form>
  </div>

  <QrPaymentModal
    v-if="mostrarQr"
    :monto="Number(form.montoPago)"
    :glosa="`Pasaje asiento ${asiento}`"
    @close="mostrarQr = false"
    @confirmado="registrarVenta"
  />
</template>
