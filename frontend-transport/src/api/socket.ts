import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export function connectSocket() {
  const token = localStorage.getItem('token')
  if (!token || socket) return
  socket = io(import.meta.env.VITE_WS_URL ?? '/', {
    auth: { token },
    transports: ['websocket', 'polling'],
  })
}

export function disconnectSocket() {
  socket?.disconnect()
  socket = null
}

/** Se suscribe a un evento en tiempo real; devuelve la función para cancelar. */
export function onSocket<T = unknown>(evento: string, cb: (payload: T) => void) {
  connectSocket()
  socket?.on(evento, cb)
  return () => {
    socket?.off(evento, cb)
  }
}
