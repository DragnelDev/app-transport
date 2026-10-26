<script setup lang="ts">
import { ref } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import { errMsg, http } from '@/api/http'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'

const auth = useAuthStore()
const toast = useToastStore()
const actual = ref('')
const nueva = ref('')
const repetir = ref('')

async function cambiar() {
  if (nueva.value !== repetir.value) return toast.error('Las contraseñas nuevas no coinciden')
  try {
    await http.patch('/auth/password', { actual: actual.value, nueva: nueva.value })
    toast.ok('Contraseña actualizada')
    actual.value = nueva.value = repetir.value = ''
  } catch (e) {
    toast.error(errMsg(e))
  }
}
</script>

<template>
  <PageHeader title="Mi cuenta" />
  <div class="grid max-w-3xl gap-5 md:grid-cols-2">
    <div class="card space-y-1 p-5 text-sm">
      <h3 class="mb-2 font-semibold">Datos</h3>
      <p><span class="text-slate-500">Nombre:</span> {{ auth.user?.nombreCompleto }}</p>
      <p><span class="text-slate-500">Usuario:</span> {{ auth.user?.usuario }}</p>
      <p><span class="text-slate-500">Rol:</span> {{ auth.user?.rol }}</p>
      <p><span class="text-slate-500">Oficina:</span> {{ auth.user?.oficinaSucursal }}</p>
    </div>
    <form class="card space-y-3 p-5" @submit.prevent="cambiar">
      <h3 class="font-semibold">Cambiar contraseña</h3>
      <div><label class="label">Actual</label><input v-model="actual" type="password" class="input" required /></div>
      <div><label class="label">Nueva (mín. 6)</label><input v-model="nueva" type="password" minlength="6" class="input" required /></div>
      <div><label class="label">Repetir nueva</label><input v-model="repetir" type="password" class="input" required /></div>
      <button class="btn-primary">Actualizar</button>
    </form>
  </div>
</template>
