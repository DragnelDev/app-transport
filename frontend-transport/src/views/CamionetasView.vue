<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import AppModal from '@/components/AppModal.vue'
import PageHeader from '@/components/PageHeader.vue'
import { errMsg, http } from '@/api/http'
import type { Camioneta } from '@/api/types'
import { useToastStore } from '@/stores/toast'
import { fechaHora } from '@/utils/format'

const toast = useToastStore()
const items = ref<Camioneta[]>([])
const modal = ref(false)
const editId = ref<number | null>(null)
const form = reactive({ placa: '', marcaModelo: '', choferNombre: '', choferTelefono: '', permiteSobrecupo: false, activa: true })

const cargar = async () => (items.value = (await http.get<Camioneta[]>('/camionetas')).data)

function abrir(c?: Camioneta) {
  editId.value = c?.id ?? null
  Object.assign(form, c ? { placa: c.placa, marcaModelo: c.marcaModelo, choferNombre: c.choferNombre, choferTelefono: c.choferTelefono ?? '', permiteSobrecupo: c.permiteSobrecupo, activa: c.activa } : { placa: '', marcaModelo: 'Toyota HiAce', choferNombre: '', choferTelefono: '', permiteSobrecupo: false, activa: true })
  modal.value = true
}

async function guardar() {
  try {
    const body = { ...form, choferTelefono: form.choferTelefono || undefined }
    if (editId.value) await http.patch(`/camionetas/${editId.value}`, body)
    else await http.post('/camionetas', body)
    toast.ok('Camioneta guardada')
    modal.value = false
    await cargar()
  } catch (e) {
    toast.error(errMsg(e))
  }
}

onMounted(cargar)
</script>

<template>
  <PageHeader title="Flota de camionetas" subtitle="Capacidad estándar de 7 asientos y habilitación del asiento 8">
    <button class="btn-primary" @click="abrir()">+ Nueva camioneta</button>
  </PageHeader>
  <div class="card overflow-x-auto">
    <table class="table-base">
      <thead><tr><th>Placa</th><th>Modelo</th><th>Chofer</th><th>Teléfono</th><th>Capacidad</th><th>Estado</th><th>Registro</th><th></th></tr></thead>
      <tbody>
        <tr v-for="c in items" :key="c.id">
          <td class="font-semibold">{{ c.placa }}</td><td>{{ c.marcaModelo }}</td><td>{{ c.choferNombre }}</td><td>{{ c.choferTelefono ?? '—' }}</td>
          <td>{{ c.capacidadEstandar }} <span v-if="c.permiteSobrecupo" class="badge bg-purple-100 text-purple-700">+1 sobrecupo</span></td>
          <td><span :class="['badge', c.activa ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600']">{{ c.activa ? 'Activa' : 'Inactiva' }}</span></td>
          <td class="text-xs text-slate-500">{{ fechaHora(c.createdAt) }}<br />{{ c.creador?.nombreCompleto }}</td>
          <td class="text-right"><button class="btn-secondary btn-sm" @click="abrir(c)">Editar</button></td>
        </tr>
      </tbody>
    </table>
  </div>
  <AppModal v-if="modal" :title="editId ? 'Editar camioneta' : 'Nueva camioneta'" @close="modal = false">
    <form id="f-cam" class="grid gap-4 sm:grid-cols-2" @submit.prevent="guardar">
      <div><label class="label">Placa</label><input v-model="form.placa" class="input uppercase" required /></div>
      <div><label class="label">Marca / modelo</label><input v-model="form.marcaModelo" class="input" required /></div>
      <div><label class="label">Chofer</label><input v-model="form.choferNombre" class="input" required /></div>
      <div><label class="label">Teléfono del chofer (WhatsApp)</label><input v-model="form.choferTelefono" class="input" /></div>
      <label class="flex items-center gap-2 text-sm"><input v-model="form.permiteSobrecupo" type="checkbox" /> Permite asiento 8 (medio delantero)</label>
      <label v-if="editId" class="flex items-center gap-2 text-sm"><input v-model="form.activa" type="checkbox" /> Activa</label>
    </form>
    <template #footer><button class="btn-secondary" @click="modal = false">Cancelar</button><button class="btn-primary" form="f-cam">Guardar</button></template>
  </AppModal>
</template>
