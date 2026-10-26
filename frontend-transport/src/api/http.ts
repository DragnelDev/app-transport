import axios, { AxiosError } from 'axios'

export const http = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? '/api' })

http.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

http.interceptors.response.use(
  (r) => r,
  (err: AxiosError) => {
    if (err.response?.status === 401 && !location.pathname.startsWith('/login')) {
      localStorage.removeItem('token')
      location.href = '/login'
    }
    return Promise.reject(err)
  },
)

/** Extrae un mensaje legible de un error de la API. */
export function errMsg(e: unknown): string {
  const data = (e as AxiosError<{ message?: string | string[] }>)?.response?.data
  if (data?.message) return Array.isArray(data.message) ? data.message.join(' · ') : data.message
  if ((e as AxiosError)?.code === 'ERR_NETWORK') return 'No se pudo conectar con el servidor'
  return (e as Error)?.message ?? 'Error inesperado'
}

/** Descarga un recurso binario autenticado (PDF, etc.) y lo abre en una pestaña nueva. */
export async function abrirBlob(url: string, tipo = 'application/pdf') {
  const { data } = await http.get(url, { responseType: 'blob' })
  const href = URL.createObjectURL(new Blob([data], { type: tipo }))
  window.open(href, '_blank')
  setTimeout(() => URL.revokeObjectURL(href), 60_000)
}
