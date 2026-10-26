<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import AppModal from '@/components/AppModal.vue'
import PageHeader from '@/components/PageHeader.vue'
import { errMsg, http } from '@/api/http'
import type { Rol, Usuario } from '@/api/types'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { fechaHora } from '@/utils/format'

const auth = useAuthStore()
const toast = useToastStore()
const items = ref<Usuario[]>([])
const modal = ref(false)
const editId = ref<number | null>(null)
const form = reactive({ nombreCompleto: '', usuario: '', password: '', rol: 'Secretaria' as Rol, oficinaSucursal: '', activo: true })

const cargar = async () => (items.value = (await http.get<Usuario[]>('/usuarios')).data)

function abrir(u?: Usuario) {
  editId.value = u?.id ?? null
  Object.assign(form, u ? { nombreCompleto: u.nombreCompleto, usuario: u.usuario, password: '', rol: u.rol, oficinaSucursal: u.oficinaSucursal, activo: u.activo } : { nombreCompleto: '', usuario: '', password: '', rol: 'Secretaria', oficinaSucursal: auth.user?.oficinaSucursal ?? '', activo: true })
  modal.value = true
}

async function guardar() {
  try {
    if (editId.value) {
      await http.patch(`/usuarios/${editId.value}`, { nombreCompleto: form.nombreCompleto, rol: form.rol, oficinaSucursal: form.oficinaSucursal, activo: form.activo, password: form.password || undefined })
    } else {
      await http.post('/usuarios', form)
    }
    toast.ok('Usuario guardado')
    modal.value = false
    await cargar()
  } catch (e) {
    toast.error(errMsg(e))
  }
}

onMounted(cargar)
</script>

<template>
  <PageHeader title="Usuarios" subtitle="Secretarias y administradores del sistema">
    <button class="btn-primary" @click="abrir()">+ Nuevo usuario</button>
  </PageHeader>
  <div class="card overflow-x-auto">
    <table class="table-base">
      <thead><tr><th>Nombre</th><th>Usuario</th><th>Rol</th><th>Oficina</th><th>Estado</th><th>Alta</th><th></th></tr></thead>
      <tbody>
        <tr v-for="u in items" :key="u.id">
          <td class="font-medium">{{ u.nombreCompleto }}</td><td>{{ u.usuario }}</td><td>{{ u.rol }}</td><td>{{ u.oficinaSucursal }}</td>
          <td><span :class="['badge', u.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600']">{{ u.activo ? 'Activo' : 'Inactivo' }}</span></td>
          <td class="text-xs text-slate-500">{{ fechaHora(u.createdAt) }}</td>
          <td class="text-right"><button class="btn-secondary btn-sm" @click="abrir(u)">Editar</button></td>
        </tr>
      </tbody>
    </table>
  </div>
  <AppModal v-if="modal" :title="editId ? 'Editar usuario' : 'Nuevo usuario'" @close="modal = false">
    <form id="f-usr" class="grid gap-4 sm:grid-cols-2" @submit.prevent="guardar">
      <div class="sm:col-span-2"><label class="label">Nombre completo</label><input v-model="form.nombreCompleto" class="input" required /></div>
      <div><label class="label">Usuario</label><input v-model="form.usuario" class="input" :disabled="!!editId" minlength="3" required /></div>
      <div><label class="label">{{ editId ? 'Nueva contraseña (opcional)' : 'Contraseña' }}</label><input v-model="form.password" type="password" class="input" minlength="6" :required="!editId" autocomplete="new-password" /></div>
      <div><label class="label">Rol</label><select v-model="form.rol" class="input"><option>Secretaria</option><option>Administrador</option></select></div>
      <div><label class="label">Oficina / sucursal</label><input v-model="form.oficinaSucursal" class="input" required /></div>
      <label v-if="editId" class="flex items-center gap-2 text-sm"><input v-model="form.activo" type="checkbox" /> Activo</label>
    </form>
    <template #footer><button class="btn-secondary" @click="modal = false">Cancelar</button><button class="btn-primary" form="f-usr">Guardar</button></template>
  </AppModal>
</template>
