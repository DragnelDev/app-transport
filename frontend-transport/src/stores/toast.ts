import { ref } from 'vue'
import { defineStore } from 'pinia'

export interface Toast {
  id: number
  tipo: 'ok' | 'error' | 'info'
  texto: string
}

export const useToastStore = defineStore('toast', () => {
  const items = ref<Toast[]>([])
  let seq = 0

  function push(tipo: Toast['tipo'], texto: string, ms = 4500) {
    const id = ++seq
    items.value.push({ id, tipo, texto })
    setTimeout(() => (items.value = items.value.filter((t) => t.id !== id)), ms)
  }

  return {
    items,
    ok: (t: string) => push('ok', t),
    error: (t: string) => push('error', t, 7000),
    info: (t: string) => push('info', t),
  }
})
