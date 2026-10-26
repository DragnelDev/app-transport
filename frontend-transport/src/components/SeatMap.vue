<script setup lang="ts">
import { computed } from 'vue'
import type { AsientosInfo } from '@/api/types'

const props = defineProps<{ info: AsientosInfo; seleccionado: number | null }>()
const emit = defineEmits<{ seleccionar: [numero: number] }>()

const ocupados = computed(() => new Map(props.info.ocupados.map((o) => [o.numero, o])))

type Estado = 'libre' | 'ocupado' | 'seleccionado' | 'deshabilitado'
function estado(n: number): Estado {
  if (n > props.info.capacidad) return 'deshabilitado'
  if (ocupados.value.has(n)) return 'ocupado'
  return props.seleccionado === n ? 'seleccionado' : 'libre'
}

const clases: Record<Estado, string> = {
  libre: 'bg-emerald-500 text-white hover:bg-emerald-600 cursor-pointer',
  ocupado: 'bg-slate-400 text-white cursor-not-allowed',
  seleccionado: 'bg-blue-600 text-white ring-4 ring-blue-300 cursor-pointer',
  deshabilitado: 'border-2 border-dashed border-slate-300 bg-slate-50 text-slate-300 cursor-not-allowed',
}

function click(n: number) {
  if (estado(n) === 'libre' || estado(n) === 'seleccionado') emit('seleccionar', n)
}

// Distribución de una camioneta tipo van: cabina (8 + chofer), 2ª fila 3 asientos, 3ª fila 4 asientos
const filas = [[8, 0], [1, 2, 3], [4, 5, 6, 7]] as const
</script>

<template>
  <div class="mx-auto w-fit rounded-3xl border-2 border-slate-300 bg-slate-50 p-4">
    <p class="mb-2 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400">↑ Frente</p>
    <div v-for="(fila, i) in filas" :key="i" class="mb-3 flex items-center justify-center gap-3">
      <template v-for="n in fila" :key="n">
        <div v-if="n === 0" class="flex h-16 w-16 flex-col items-center justify-center rounded-xl bg-slate-700 text-[11px] text-white">
          🚐<span>Chofer</span>
        </div>
        <button
          v-else
          type="button"
          :class="['flex h-16 w-16 flex-col items-center justify-center rounded-xl text-lg font-bold transition', clases[estado(n)]]"
          :title="ocupados.get(n)?.nombre ?? (n === 8 ? 'Asiento medio delantero (sobrecupo)' : `Asiento ${n}`)"
          :disabled="estado(n) === 'ocupado' || estado(n) === 'deshabilitado'"
          @click="click(n)"
        >
          {{ n }}
          <span v-if="ocupados.get(n)" class="max-w-14 truncate px-1 text-[9px] font-normal">{{ ocupados.get(n)!.nombre.split(' ')[0] }}</span>
          <span v-else-if="n === 8" class="text-[9px] font-normal">medio</span>
        </button>
      </template>
    </div>
    <div class="mt-4 flex justify-center gap-4 text-xs text-slate-600">
      <span class="flex items-center gap-1"><i class="inline-block h-3 w-3 rounded bg-emerald-500"></i>Libre</span>
      <span class="flex items-center gap-1"><i class="inline-block h-3 w-3 rounded bg-slate-400"></i>Ocupado</span>
      <span class="flex items-center gap-1"><i class="inline-block h-3 w-3 rounded bg-blue-600"></i>Seleccionado</span>
    </div>
  </div>
</template>
