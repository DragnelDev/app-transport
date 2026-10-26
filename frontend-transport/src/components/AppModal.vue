<script setup lang="ts">
defineProps<{ title: string; width?: string }>()
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 pt-12" @mousedown.self="emit('close')">
    <div :class="['card w-full', width ?? 'max-w-xl']" role="dialog" aria-modal="true">
      <div class="flex items-center justify-between border-b border-slate-200 px-5 py-3">
        <h3 class="text-base font-semibold">{{ title }}</h3>
        <button class="text-2xl leading-none text-slate-400 hover:text-slate-700" aria-label="Cerrar" @click="emit('close')">×</button>
      </div>
      <div class="p-5"><slot /></div>
      <div v-if="$slots.footer" class="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">
        <slot name="footer" />
      </div>
    </div>
  </div>
</template>
