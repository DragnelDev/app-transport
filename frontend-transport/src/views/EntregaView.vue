<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import QrPaymentModal from '@/components/QrPaymentModal.vue'
import { errMsg, http } from '@/api/http'
import type { Encomienda, MetodoPago } from '@/api/types'
import { useToastStore } from '@/stores/toast'
import { clasesEstadoEntrega, fechaHora, money } from '@/utils/format'

const toast = useToastStore()
const route = useRoute()
const q = ref('')
const input = ref<HTMLInputElement>()
const resultados = ref<Encomienda[]>([])
const buscado = ref(false)
const metodo = ref<MetodoPago>('Efectivo')
const recibido = ref<Record<number, { nombre: string; ci: string }>>({})
const qrPara = ref<Encomienda | null>(null)

async function buscar() {
  if (!q.value.trim()) return
  const { data } = await http.get<Encomienda[]>('/encomiendas/buscar', { params: { q: q.value.trim() } })
  resultados.value = data
  buscado.value = true
  data.forEach((e) => (recibido.value[e.id] ??= { nombre: e.destinatarioNombre, ci: e.destinatarioCi ?? '' }))
  // Una lectura de pistola/QR que coincide con una sola guía queda lista para entregar; se limpia para el siguiente escaneo
  if (data.length === 1) q.value = ''
  input.value?.focus()
}

async function entregar(e: Encomienda, pagoQrId?: number) {
  try {
    await http.post(`/encomiendas/${e.id}/entregar`, {
      metodoPago: e.pagado ? undefined : metodo.value,
      pagoQrId,
      recibidoPorNombre: recibido.value[e.id]?.nombre,
      recibidoPorCi: recibido.value[e.id]?.ci || undefined,
    })
    toast.ok(`Entregada ${e.codigoGuia}`)
    await recargar(e)
  } catch (err) {
    toast.error(errMsg(err))
  } finally {
    qrPara.value = null
  }
}

function pedirEntrega(e: Encomienda) {
  if (!e.pagado && metodo.value === 'QR') qrPara.value = e
  else void entregar(e)
}

async function marcarListo(e: Encomienda) {
  try {
    await http.post(`/encomiendas/${e.id}/marcar-listo`)
    toast.ok('Marcada como lista en destino')
    await recargar(e)
  } catch (err) {
    toast.error(errMsg(err))
  }
}

async function recargar(e: Encomienda) {
  const { data } = await http.get<Encomienda>(`/encomiendas/${e.id}`)
  resultados.value = resultados.value.map((r) => (r.id === e.id ? data : r))
}

onMounted(() => {
  if (typeof route.query.q === 'string') { q.value = route.query.q; void buscar() }
  input.value?.focus()
})
</script>

<template>
  <PageHeader title="Entrega en destino" subtitle="Escanee el QR de la guía (pistola USB o cámara) o busque por CI / teléfono del destinatario" />

  <form class="card mb-5 flex gap-3 p-4" @submit.prevent="buscar">
    <input ref="input" v-model="q" class="input !text-lg" placeholder="Código ENC-2026-… / CI / teléfono" autofocus />
    <button class="btn-primary px-8">Buscar</button>
  </form>

  <div class="space-y-4">
    <div v-for="e in resultados" :key="e.id" class="card p-5">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div class="font-mono text-xl font-bold">{{ e.codigoGuia }}</div>
          <span :class="['badge', clasesEstadoEntrega[e.estadoEntrega]]">{{ e.estadoEntrega }}</span>
        </div>
        <div class="text-right">
          <div class="text-2xl font-bold">{{ money(e.montoCobrado) }}</div>
          <span v-if="e.pagado" class="badge bg-emerald-100 text-emerald-700">Pagado ({{ e.metodoPago }})</span>
          <span v-else class="badge bg-red-100 text-red-700">COBRAR EN DESTINO</span>
        </div>
      </div>
      <div class="mt-3 grid gap-3 text-sm sm:grid-cols-3">
        <div><span class="label">Remitente</span>{{ e.remitenteNombre }}<br />{{ e.remitenteTelefono }}</div>
        <div><span class="label">Destinatario</span>{{ e.destinatarioNombre }}<br />CI {{ e.destinatarioCi ?? '—' }} · {{ e.destinatarioTelefono }}</div>
        <div><span class="label">Contenido</span>{{ e.cantidadBultos }}× {{ e.descripcion }}<br />Destino: {{ e.oficinaDestino ?? '—' }}</div>
      </div>

      <div v-if="e.estadoEntrega === 'Listo en Oficina Destino'" class="mt-4 grid items-end gap-3 rounded-lg bg-slate-50 p-4 sm:grid-cols-4">
        <div><label class="label">Recibe (nombre)</label><input v-model="recibido[e.id]!.nombre" class="input" /></div>
        <div><label class="label">CI de quien recibe</label><input v-model="recibido[e.id]!.ci" class="input" /></div>
        <div v-if="!e.pagado"><label class="label">Cobro</label><select v-model="metodo" class="input"><option>Efectivo</option><option>QR</option></select></div>
        <button class="btn-success !py-2.5" @click="pedirEntrega(e)">{{ e.pagado ? '📬 Entregar paquete' : `💵 Cobrar ${money(e.montoCobrado)} y entregar` }}</button>
      </div>
      <div v-else-if="e.estadoEntrega === 'En Carga/Viaje'" class="mt-4 flex items-center justify-between rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
        El paquete aún figura en viaje. Si ya llegó a esta oficina:
        <button class="btn-primary btn-sm" @click="marcarListo(e)">Marcar como listo en destino</button>
      </div>
      <p v-else-if="e.estadoEntrega === 'Entregado'" class="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">Entregado el {{ fechaHora(e.entregadoAt) }} a {{ e.recibidoPorNombre }} (CI {{ e.recibidoPorCi ?? '—' }}).</p>
      <p v-else class="mt-4 rounded-lg bg-slate-100 p-3 text-sm text-slate-600">El paquete todavía está en la oficina de origen.</p>
    </div>
    <p v-if="buscado && !resultados.length" class="py-8 text-center text-slate-400">No se encontraron encomiendas</p>
  </div>

  <QrPaymentModal v-if="qrPara" :monto="qrPara.montoCobrado" :glosa="`Encomienda ${qrPara.codigoGuia}`" @close="qrPara = null" @confirmado="(id) => entregar(qrPara!, id)" />
</template>
