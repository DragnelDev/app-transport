<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import AppModal from './AppModal.vue'
import { errMsg, http } from '@/api/http'
import { onSocket } from '@/api/socket'
import type { PagoQr } from '@/api/types'
import { useToastStore } from '@/stores/toast'
import { money } from '@/utils/format'

const props = defineProps<{ monto: number; glosa?: string }>()
const emit = defineEmits<{ confirmado: [pagoId: number]; close: [] }>()

const toast = useToastStore()
const pago = ref<PagoQr | null>(null)
const cargando = ref(true)
const restante = ref(0)
let poll: ReturnType<typeof setInterval> | undefined
let tick: ReturnType<typeof setInterval> | undefined
let off: (() => void) | undefined

const esMock = computed(() => pago.value?.transaccionIdBanco?.startsWith('MOCK-'))

async function generar() {
  cargando.value = true
  try {
    const { data } = await http.post<PagoQr>('/pagos-qr', { monto: props.monto, glosa: props.glosa })
    pago.value = data
    iniciarVigilancia()
  } catch (e) {
    toast.error(errMsg(e))
  } finally {
    cargando.value = false
  }
}

function aplicar(p: PagoQr) {
  pago.value = p
  if (p.estado === 'Completado') {
    detener()
    emit('confirmado', p.id)
  } else if (p.estado !== 'Pendiente') {
    detener()
  }
}

async function consultar() {
  if (!pago.value) return
  try {
    const { data } = await http.get<PagoQr>(`/pagos-qr/${pago.value.id}`)
    aplicar(data)
  } catch {
    /* reintenta en el siguiente ciclo */
  }
}

function iniciarVigilancia() {
  detener()
  // Tiempo real por WebSocket (webhook del banco) + sondeo de respaldo
  off = onSocket<{ id: number; estado: string }>('pago:actualizado', (e) => {
    if (e.id === pago.value?.id) void consultar()
  })
  poll = setInterval(consultar, 4000)
  tick = setInterval(() => {
    if (!pago.value) return
    restante.value = Math.max(0, Math.floor((new Date(pago.value.fechaExpiracion).getTime() - Date.now()) / 1000))
  }, 1000)
}

function detener() {
  clearInterval(poll)
  clearInterval(tick)
  off?.()
  off = undefined
}

async function simular() {
  if (!pago.value) return
  try {
    const { data } = await http.post<PagoQr>(`/pagos-qr/${pago.value.id}/simular`)
    aplicar(data)
  } catch (e) {
    toast.error(errMsg(e))
  }
}

const mmss = computed(() => `${String(Math.floor(restante.value / 60)).padStart(2, '0')}:${String(restante.value % 60).padStart(2, '0')}`)

onMounted(generar)
onUnmounted(detener)
</script>

<template>
  <AppModal title="Cobro con QR" width="max-w-md" @close="emit('close')">
    <div class="text-center">
      <p class="text-3xl font-bold text-slate-900">{{ money(monto) }}</p>
      <p class="mb-3 text-sm text-slate-500">El cliente escanea el QR con su app bancaria</p>

      <div v-if="cargando" class="py-16 text-slate-400">Generando QR…</div>
      <template v-else-if="pago">
        <div class="relative mx-auto inline-block">
          <img :src="pago.imagenQrBase64" alt="Código QR de pago" class="mx-auto h-64 w-64 rounded-lg border border-slate-200 p-2" />
          <div v-if="pago.estado === 'Completado'" class="absolute inset-0 flex items-center justify-center rounded-lg bg-emerald-600/90 text-xl font-bold text-white">
            ✔ Pago confirmado
          </div>
          <div v-else-if="pago.estado !== 'Pendiente'" class="absolute inset-0 flex items-center justify-center rounded-lg bg-slate-800/85 text-xl font-bold text-white">
            QR {{ pago.estado.toLowerCase() }}
          </div>
        </div>

        <p v-if="pago.estado === 'Pendiente'" class="mt-3 text-sm text-slate-600">
          <span class="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-500"></span>
          Esperando confirmación del banco… expira en <b>{{ mmss }}</b>
        </p>

        <div class="mt-4 flex justify-center gap-2">
          <button v-if="pago.estado === 'Expirado' || pago.estado === 'Fallido'" class="btn-primary" @click="generar">Generar nuevo QR</button>
          <button v-if="esMock && pago.estado === 'Pendiente'" class="btn-secondary" @click="simular">
            🧪 Simular pago (modo pruebas)
          </button>
        </div>
      </template>
    </div>
  </AppModal>
</template>
