import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { http } from '@/api/http'
import { connectSocket, disconnectSocket } from '@/api/socket'
import type { AuthUser } from '@/api/types'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('token'))
  const user = ref<AuthUser | null>(null)

  const isAuth = computed(() => !!token.value)
  const isAdmin = computed(() => user.value?.rol === 'Administrador')

  async function login(usuario: string, password: string) {
    const { data } = await http.post<{ accessToken: string; user: AuthUser }>('/auth/login', {
      usuario,
      password,
    })
    token.value = data.accessToken
    user.value = data.user
    localStorage.setItem('token', data.accessToken)
    connectSocket()
  }

  async function fetchMe() {
    if (!token.value) return
    try {
      const { data } = await http.get<AuthUser>('/auth/me')
      user.value = data
      connectSocket()
    } catch {
      logout()
    }
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem('token')
    disconnectSocket()
  }

  return { token, user, isAuth, isAdmin, login, fetchMe, logout }
})
