<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const menu = computed(() => {
  const base = [
    { to: '/', label: 'Panel', icon: '📊' },
    { to: '/boleteria', label: 'Boletería', icon: '🎫' },
    { to: '/salidas', label: 'Turnos y salidas', icon: '🕒' },
    { to: '/encomiendas', label: 'Encomiendas', icon: '📦' },
    { to: '/entrega', label: 'Entrega en destino', icon: '📬' },
    { to: '/caja', label: 'Cierre de caja', icon: '💵' },
  ]
  const admin = [
    { to: '/camionetas', label: 'Camionetas', icon: '🚐' },
    { to: '/rutas', label: 'Rutas y tarifas', icon: '🗺️' },
    { to: '/usuarios', label: 'Usuarios', icon: '👥' },
    { to: '/notificaciones', label: 'WhatsApp', icon: '💬' },
  ]
  return { base, admin: auth.isAdmin ? admin : [] }
})

function salir() {
  auth.logout()
  router.push('/login')
}
</script>

<template>
  <div class="flex h-full">
    <aside class="flex w-60 shrink-0 flex-col bg-slate-900 text-slate-200">
      <div class="px-5 py-5">
        <div class="text-lg font-bold text-white">🚐 TransporteApp</div>
        <div class="text-xs text-slate-400">Boletería y encomiendas</div>
      </div>
      <nav class="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
        <RouterLink
          v-for="m in menu.base"
          :key="m.to"
          :to="m.to"
          class="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-slate-800"
          active-class="!bg-brand-600 text-white"
          :exact-active-class="m.to === '/' ? '!bg-brand-600 text-white' : ''"
        >
          <span>{{ m.icon }}</span>{{ m.label }}
        </RouterLink>
        <template v-if="menu.admin.length">
          <div class="px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Administración</div>
          <RouterLink
            v-for="m in menu.admin"
            :key="m.to"
            :to="m.to"
            class="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-slate-800"
            active-class="!bg-brand-600 text-white"
          >
            <span>{{ m.icon }}</span>{{ m.label }}
          </RouterLink>
        </template>
      </nav>
      <div class="border-t border-slate-800 p-3 text-sm">
        <RouterLink to="/perfil" class="block rounded-lg px-2 py-1.5 hover:bg-slate-800">
          <div class="truncate font-medium text-white">{{ auth.user?.nombreCompleto }}</div>
          <div class="truncate text-xs text-slate-400">{{ auth.user?.rol }} · {{ auth.user?.oficinaSucursal }}</div>
        </RouterLink>
        <button class="mt-2 w-full rounded-lg px-2 py-1.5 text-left text-slate-300 hover:bg-slate-800" @click="salir">⏻ Cerrar sesión</button>
      </div>
    </aside>

    <main class="min-w-0 flex-1 overflow-y-auto">
      <div class="mx-auto max-w-[1500px] p-6" :key="route.fullPath.split('?')[0]">
        <RouterView />
      </div>
    </main>
  </div>
</template>
