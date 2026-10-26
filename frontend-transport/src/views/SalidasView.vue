<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppModal from '@/components/AppModal.vue'
import PageHeader from '@/components/PageHeader.vue'
import { abrirBlob, errMsg, http } from '@/api/http'
import type { Camioneta, EstadoSalida, Ruta, Salida } from '@/api/types'
import { useToastStore } from '@/stores/toast'
import { clasesEstadoSalida, fechaCorta, hoyISO, hora, toInputDateTime } from '@/utils/format'

const toast = useToastStore()
const router = useRouter()

const salidas = ref<Salida[]>([])
const camionetas = ref<Camioneta[]>([])
const rutas = ref<Ruta[]>([])
const fecha = ref(hoyISO())
const estado = ref('')
const modal = ref(false)
const editId = ref<number | null>(null)
const form = reactive({ camionetaId: 0, rutaId: 0, fechaHora: '', sobrecupo: false })

const camionetaSel = computed(() => camionetas.value.find((c) => c.id === form.camionetaId))

async function cargar() {
  const { data } = await http.get<Salida[]>('/salidas', { params: { fecha: fecha.value || undefined, estado: estado.value || undefined } })
  salidas.value = data
}

function nueva() {
  editId.value = null
  const d = new Date(); d.setMinutes(0, 0, 0); d.setHours(d.getHours() + 1)
  Object.assign(form, { camionetaId: camionetas.value[0]?.id ?? 0, rutaId: rutas.value[0]?.id ?? 0, fechaHora: toInputDateTime(d), sobrecupo: false })
  modal.value = true
}

function editar(s: Salida) {
  editId.value = s.id
  Object.assign(form, { camionetaId: s.camionetaId, rutaId: s.rutaId, fechaHora: toInputDateTime(s.fechaHoraProgramada), sobrecupo: s.capacidadMaximaTurno === 8 })
  modal.value = true
}

async function guardar() {
  const body = {
    camionetaId: form.camionetaId, rutaId: form.rutaId,
    fechaHoraProgramada: new Date(form.fechaHora).toISOString(),
    habilitarSobrecupo: form.sobrecupo,
  }
  try {
    if (editId.value) await http.patch(`/salidas/${editId.value}`, body)
    else await http.post('/salidas', body)
    toast.ok(editId.value ? 'Turno actualizado' : 'Turno programado')
    modal.value = false
    await cargar()
  } catch (e) {
    toast.error(errMsg(e))
  }
}

async function cambiarEstado(s: Salida, nuevo: EstadoSalida) {
  const txt = { 'En Trayecto': 'Iniciar el viaje (las encomiendas pasarán a "En Carga/Viaje" y se notificará por WhatsApp)', Finalizado: 'Finalizar el viaje (las encomiendas quedarán listas para retiro y se notificará al destinatario)', Cancelado: 'Cancelar el turno' }[nuevo as string]
  if (!window.confirm(`${txt}. ¿Continuar?`)) return
  try {
    await http.patch(`/salidas/${s.id}/estado`, { estado: nuevo })
    toast.ok(`Salida: ${nuevo}`)
    await cargar()
  } catch (e) {
    toast.error(errMsg(e))
  }
}

async function whatsapp(s: Salida) {
  try {
    await http.post(`/salidas/${s.id}/manifiesto/whatsapp`)
    toast.ok('Manifiesto enviado a la cola de WhatsApp del conductor')
  } catch (e) {
    toast.error(errMsg(e))
  }
}

watch([fecha, estado], cargar)
onMounted(async () => {
  const [c, r] = await Promise.all([http.get<Camioneta[]>('/camionetas', { params: { activas: true } }), http.get<Ruta[]>('/rutas', { params: { activas: true } })])
  camionetas.value = c.data
  rutas.value = r.data
  await cargar()
})
</script>

<template>
  <PageHeader title="Turnos y salidas" subtitle="Rol de salidas por fecha, con habilitación del asiento 8">
    <input v-model="fecha" type="date" class="input !w-auto" />
    <select v-model="estado" class="input !w-auto">
      <option value="">Todos los estados</option>
      <option>Programado</option><option>En Trayecto</option><option>Finalizado</option><option>Cancelado</option>
    </select>
    <button class="btn-primary" @click="nueva">+ Programar turno</button>
  </PageHeader>

  <div class="card overflow-x-auto">
    <table class="table-base">
      <thead><tr><th>Fecha</th><th>Hora</th><th>Ruta</th><th>Camioneta / Chofer</th><th>Ocupación</th><th>Estado</th><th>Creado por</th><th></th></tr></thead>
      <tbody>
        <tr v-for="s in salidas" :key="s.id">
          <td>{{ fechaCorta(s.fechaHoraProgramada) }}</td>
          <td class="font-semibold">{{ hora(s.fechaHoraProgramada) }}</td>
          <td>{{ s.ruta?.origen }} → {{ s.ruta?.destino }}</td>
          <td>{{ s.camioneta?.placa }}<div class="text-xs text-slate-500">{{ s.camioneta?.choferNombre }}</div></td>
          <td>{{ s.ocupados }}/{{ s.capacidadMaximaTurno }} <span v-if="s.capacidadMaximaTurno === 8" class="badge bg-purple-100 text-purple-700">asiento 8</span></td>
          <td><span :class="['badge', clasesEstadoSalida[s.estado]]">{{ s.estado }}</span></td>
          <td class="text-xs text-slate-500">{{ s.creador?.nombreCompleto ?? '—' }}</td>
          <td class="space-x-1 whitespace-nowrap text-right">
            <template v-if="s.estado === 'Programado'">
              <button class="btn-secondary btn-sm" @click="router.push({ path: '/boleteria', query: { salida: s.id } })">🎫 Vender</button>
              <button class="btn-secondary btn-sm" @click="editar(s)">Editar</button>
              <button class="btn-success btn-sm" @click="cambiarEstado(s, 'En Trayecto')">▶ Iniciar</button>
              <button class="btn-danger btn-sm" @click="cambiarEstado(s, 'Cancelado')">Cancelar</button>
            </template>
            <button v-if="s.estado === 'En Trayecto'" class="btn-success btn-sm" @click="cambiarEstado(s, 'Finalizado')">✔ Finalizar</button>
            <button class="btn-secondary btn-sm" @click="abrirBlob(`/salidas/${s.id}/manifiesto`)">📄 Manifiesto</button>
            <button class="btn-secondary btn-sm" @click="whatsapp(s)">💬</button>
          </td>
        </tr>
        <tr v-if="!salidas.length"><td colspan="8" class="py-8 text-center text-slate-400">Sin salidas para los filtros elegidos</td></tr>
      </tbody>
    </table>
  </div>

  <AppModal v-if="modal" :title="editId ? 'Editar turno' : 'Programar turno'" @close="modal = false">
    <form id="f-salida" class="grid gap-4 sm:grid-cols-2" @submit.prevent="guardar">
      <div><label class="label">Camioneta</label>
        <select v-model.number="form.camionetaId" class="input" required>
          <option v-for="c in camionetas" :key="c.id" :value="c.id">{{ c.placa }} · {{ c.choferNombre }}</option>
        </select>
      </div>
      <div><label class="label">Ruta</label>
        <select v-model.number="form.rutaId" class="input" required>
          <option v-for="r in rutas" :key="r.id" :value="r.id">{{ r.origen }} → {{ r.destino }}</option>
        </select>
      </div>
      <div class="sm:col-span-2"><label class="label">Fecha y hora de salida</label><input v-model="form.fechaHora" type="datetime-local" class="input" required /></div>
      <label class="flex items-center gap-2 text-sm sm:col-span-2" :class="!camionetaSel?.permiteSobrecupo && 'opacity-50'">
        <input v-model="form.sobrecupo" type="checkbox" :disabled="!camionetaSel?.permiteSobrecupo" />
        Habilitar asiento 8 (medio delantero) por alta demanda
        <span v-if="!camionetaSel?.permiteSobrecupo" class="text-xs text-slate-500">(esta unidad no lo permite)</span>
      </label>
    </form>
    <template #footer>
      <button class="btn-secondary" @click="modal = false">Cancelar</button>
      <button class="btn-primary" form="f-salida">Guardar</button>
    </template>
  </AppModal>
</template>
