<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import { http } from '@/api/http'
import type { DashboardData, Salida } from '@/api/types'
import { useAuthStore } from '@/stores/auth'
import { clasesEstadoSalida, fechaCorta, hora, money } from '@/utils/format'

const auth = useAuthStore()
const data = ref<DashboardData | null>(null)
const cola = ref<Salida[]>([])

onMounted(async () => {
  const [d, c] = await Promise.all([
    http.get<DashboardData>('/dashboard'),
    http.get<Salida[]>('/salidas/cola', { params: { oficina: auth.user?.oficinaSucursal } }),
  ])
  data.value = d.data
  cola.value = c.data.slice(0, 8)
})
</script>

<template>
  <PageHeader :title="`Hola, ${auth.user?.nombreCompleto.split(' ')[0]}`" :subtitle="`Resumen de hoy · ${auth.user?.oficinaSucursal}`">
    <RouterLink to="/boleteria" class="btn-primary">🎫 Vender pasaje</RouterLink>
    <RouterLink to="/encomiendas" class="btn-secondary">📦 Nueva encomienda</RouterLink>
  </PageHeader>

  <div v-if="data" class="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    <div class="card p-4"><p class="label">Salidas de hoy</p><p class="text-3xl font-bold">{{ data.salidasHoy }}</p><p class="text-xs text-slate-500">{{ data.programadas }} programadas · {{ data.enTrayecto }} en trayecto</p></div>
    <div class="card p-4"><p class="label">Pasajes vendidos hoy</p><p class="text-3xl font-bold">{{ data.pasajesHoy }}</p></div>
    <div class="card p-4"><p class="label">Ingresos hoy</p><p class="text-2xl font-bold">{{ money(data.ingresosHoy.efectivo + data.ingresosHoy.qr) }}</p><p class="text-xs text-slate-500">Efectivo {{ money(data.ingresosHoy.efectivo) }} · QR {{ money(data.ingresosHoy.qr) }}</p></div>
    <div class="card p-4">
      <p class="label">Encomiendas</p>
      <p class="text-sm"><b class="text-xl">{{ data.encomiendas.enTransito }}</b> en tránsito · <b class="text-xl">{{ data.encomiendas.listasParaRetiro }}</b> listas</p>
      <p class="text-xs text-amber-700">{{ data.encomiendas.pendientesDeCobro }} pendientes de cobro</p>
    </div>
  </div>

  <div class="card">
    <div class="border-b border-slate-200 px-4 py-3 font-semibold">Cola de turnos · {{ auth.user?.oficinaSucursal }}</div>
    <table class="table-base">
      <thead><tr><th>#</th><th>Fecha</th><th>Hora</th><th>Ruta</th><th>Placa</th><th>Ocupación</th><th>Estado</th></tr></thead>
      <tbody>
        <tr v-for="s in cola" :key="s.id">
          <td class="font-semibold">{{ s.posicion }}</td>
          <td>{{ fechaCorta(s.fechaHoraProgramada) }}</td>
          <td>{{ hora(s.fechaHoraProgramada) }}</td>
          <td>{{ s.ruta?.origen }} → {{ s.ruta?.destino }}</td>
          <td>{{ s.camioneta?.placa }}</td>
          <td>{{ s.ocupados }}/{{ s.capacidadMaximaTurno }} <span v-if="s.capacidadMaximaTurno === 8" class="badge bg-purple-100 text-purple-700">sobrecupo</span></td>
          <td><span :class="['badge', clasesEstadoSalida[s.estado]]">{{ s.estado }}</span></td>
        </tr>
        <tr v-if="!cola.length"><td colspan="7" class="py-6 text-center text-slate-400">No hay turnos programados</td></tr>
      </tbody>
    </table>
  </div>
</template>
