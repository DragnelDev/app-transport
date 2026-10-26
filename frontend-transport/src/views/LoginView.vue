<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { errMsg } from '@/api/http'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const usuario = ref('')
const password = ref('')
const error = ref('')
const cargando = ref(false)

async function entrar() {
  error.value = ''
  cargando.value = true
  try {
    await auth.login(usuario.value.trim(), password.value)
    router.push('/')
  } catch (e) {
    error.value = errMsg(e)
  } finally {
    cargando.value = false
  }
}
</script>

<template>
  <div class="flex min-h-full items-center justify-center bg-gradient-to-br from-brand-900 to-slate-900 p-4">
    <form class="card w-full max-w-sm space-y-4 p-8" @submit.prevent="entrar">
      <div class="text-center">
        <div class="text-4xl">🚐</div>
        <h1 class="mt-2 text-xl font-bold">Transporte Interprovincial</h1>
        <p class="text-sm text-slate-500">Acceso de secretarias y administración</p>
      </div>
      <div>
        <label class="label" for="usuario">Usuario</label>
        <input id="usuario" v-model="usuario" class="input" autocomplete="username" autofocus required />
      </div>
      <div>
        <label class="label" for="password">Contraseña</label>
        <input id="password" v-model="password" type="password" class="input" autocomplete="current-password" required />
      </div>
      <p v-if="error" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{{ error }}</p>
      <button class="btn-primary w-full" :disabled="cargando">{{ cargando ? 'Ingresando…' : 'Ingresar' }}</button>
    </form>
  </div>
</template>
