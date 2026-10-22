import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

/**
 * Canal de tiempo real (Socket.IO). Eventos emitidos:
 *  - pago:actualizado   {id, estado}          → confirmación de QR por webhook
 *  - salida:asientos    {salidaId}            → cambió la ocupación de una salida
 *  - encomienda:actualizada {id}
 */
@WebSocketGateway({ cors: { origin: true, credentials: true } })
export class EventsGateway implements OnGatewayConnection {
  private readonly logger = new Logger(EventsGateway.name);
  @WebSocketServer() server: Server;

  constructor(private readonly jwt: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token = (client.handshake.auth?.token as string) ?? '';
      await this.jwt.verifyAsync(token);
    } catch {
      this.logger.warn(`Conexión WS rechazada (${client.id})`);
      client.disconnect(true);
    }
  }

  emit(evento: string, payload: unknown) {
    this.server?.emit(evento, payload);
  }
}
