<script setup lang="ts">
import { useToastStore } from '@/stores/toast'
const toast = useToastStore()
const color = { ok: 'bg-emerald-600', error: 'bg-red-600', info: 'bg-slate-800' } as const
</script>

<template>
  <div class="fixed right-4 top-4 z-[100] flex w-80 flex-col gap-2">
    <div
      v-for="t in toast.items"
      :key="t.id"
      :class="['rounded-lg px-4 py-3 text-sm text-white shadow-lg', color[t.tipo]]"
      role="status"
    >
      {{ t.texto }}
    </div>
  </div>
</template>
