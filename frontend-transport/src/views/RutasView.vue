<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import AppModal from '@/components/AppModal.vue'
import PageHeader from '@/components/PageHeader.vue'
import { errMsg, http } from '@/api/http'
import type { Ruta } from '@/api/types'
import { useToastStore } from '@/stores/toast'
import { money } from '@/utils/format'

const toast = useToastStore()
const items = ref<Ruta[]>([])
const modal = ref(false)
const editId = ref<number | null>(null)
const form = reactive({ origen: '', destino: '', tarifaBase: 0, paradas: '', activa: true })

const cargar = async () => (items.value = (await http.get<Ruta[]>('/rutas')).data)

function abrir(r?: Ruta) {
  editId.value = r?.id ?? null
  Object.assign(form, r ? { origen: r.origen, destino: r.destino, tarifaBase: r.tarifaBase, paradas: r.paradas.join(', '), activa: r.activa } : { origen: '', destino: '', tarifaBase: 0, paradas: '', activa: true })
  modal.value = true
}

async function guardar() {
  const body = {
    origen: form.origen, destino: form.destino, tarifaBase: Number(form.tarifaBase),
    paradas: form.paradas.split(',').map((p) => p.trim()).filter(Boolean),
    ...(editId.value ? { activa: form.activa } : {}),
  }
  try {
    if (editId.value) await http.patch(`/rutas/${editId.value}`, body)
    else await http.post('/rutas', body)
    toast.ok('Ruta guardada')
    modal.value = false
    await cargar()
  } catch (e) {
    toast.error(errMsg(e))
  }
}

onMounted(cargar)
</script>

<template>
  <PageHeader title="Rutas y tarifas" subtitle="Origen, destino, tarifa base y paradas de bajada">
    <button class="btn-primary" @click="abrir()">+ Nueva ruta</button>
  </PageHeader>
  <div class="card overflow-x-auto">
    <table class="table-base">
      <thead><tr><th>Origen</th><th>Destino</th><th>Tarifa base</th><th>Paradas</th><th>Estado</th><th></th></tr></thead>
      <tbody>
        <tr v-for="r in items" :key="r.id">
          <td>{{ r.origen }}</td><td>{{ r.destino }}</td><td class="font-semibold">{{ money(r.tarifaBase) }}</td><td class="text-xs">{{ r.paradas.join(' · ') || '—' }}</td>
          <td><span :class="['badge', r.activa ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600']">{{ r.activa ? 'Activa' : 'Inactiva' }}</span></td>
          <td class="text-right"><button class="btn-secondary btn-sm" @click="abrir(r)">Editar</button></td>
        </tr>
      </tbody>
    </table>
  </div>
  <AppModal v-if="modal" :title="editId ? 'Editar ruta' : 'Nueva ruta'" @close="modal = false">
    <form id="f-ruta" class="grid gap-4 sm:grid-cols-2" @submit.prevent="guardar">
      <div><label class="label">Origen (oficina)</label><input v-model="form.origen" class="input" required /></div>
      <div><label class="label">Destino (oficina)</label><input v-model="form.destino" class="input" required /></div>
      <div><label class="label">Tarifa base (Bs)</label><input v-model.number="form.tarifaBase" type="number" min="0" step="0.01" class="input" required /></div>
      <label v-if="editId" class="flex items-center gap-2 self-end text-sm"><input v-model="form.activa" type="checkbox" /> Activa</label>
      <div class="sm:col-span-2"><label class="label">Paradas (separadas por coma)</label><input v-model="form.paradas" class="input" placeholder="Peaje, Plaza Central" /></div>
    </form>
    <p class="mt-3 text-xs text-slate-500">El origen debe coincidir con el nombre de la oficina de las secretarias para que la cola de turnos se filtre por sucursal.</p>
    <template #footer><button class="btn-secondary" @click="modal = false">Cancelar</button><button class="btn-primary" form="f-ruta">Guardar</button></template>
  </AppModal>
</template>
