export type Rol = 'Secretaria' | 'Administrador';

/** Usuario autenticado adjunto a la request (clase para compatibilidad con decorator metadata). */
export class AuthUser {
  id: number;
  usuario: string;
  nombreCompleto: string;
  rol: Rol;
  oficinaSucursal: string;
}
