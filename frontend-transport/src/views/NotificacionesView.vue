<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import { errMsg, http } from '@/api/http'
import type { Notificacion } from '@/api/types'
import { useToastStore } from '@/stores/toast'
import { fechaHora } from '@/utils/format'

const toast = useToastStore()
const items = ref<Notificacion[]>([])
const estado = ref('')
const clases: Record<string, string> = { Enviado: 'bg-emerald-100 text-emerald-700', Pendiente: 'bg-amber-100 text-amber-700', Fallido: 'bg-red-100 text-red-700' }

const cargar = async () => (items.value = (await http.get<Notificacion[]>('/notificaciones', { params: { estado: estado.value || undefined } })).data)

async function reintentar(n: Notificacion) {
  try {
    await http.post(`/notificaciones/${n.id}/reintentar`)
    toast.ok('Reencolada')
    await cargar()
  } catch (e) {
    toast.error(errMsg(e))
  }
}

watch(estado, cargar)
onMounted(cargar)
</script>

<template>
  <PageHeader title="Notificaciones de WhatsApp" subtitle="Cola de mensajes automáticos (procesada en segundo plano)">
    <select v-model="estado" class="input !w-auto"><option value="">Todas</option><option>Pendiente</option><option>Enviado</option><option>Fallido</option></select>
    <button class="btn-secondary" @click="cargar">↻ Actualizar</button>
  </PageHeader>
  <div class="card overflow-x-auto">
    <table class="table-base">
      <thead><tr><th>#</th><th>Fecha</th><th>Tipo</th><th>Teléfono</th><th>Mensaje</th><th>Estado</th><th></th></tr></thead>
      <tbody>
        <tr v-for="n in items" :key="n.id">
          <td>{{ n.id }}</td><td class="whitespace-nowrap">{{ fechaHora(n.createdAt) }}</td><td class="text-xs">{{ n.tipo }}</td><td>{{ n.telefono }}</td>
          <td class="max-w-md whitespace-pre-line text-xs">{{ n.mensaje }}<div v-if="n.error" class="mt-1 text-red-600">{{ n.error }}</div></td>
          <td><span :class="['badge', clases[n.estado]]">{{ n.estado }}</span><div class="text-[11px] text-slate-500">{{ n.intentos }} intento(s)</div></td>
          <td class="text-right"><button v-if="n.estado !== 'Enviado'" class="btn-secondary btn-sm" @click="reintentar(n)">Reintentar</button></td>
        </tr>
        <tr v-if="!items.length"><td colspan="7" class="py-8 text-center text-slate-400">Sin notificaciones</td></tr>
      </tbody>
    </table>
  </div>
</template>
