import {
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TipoNotificacion } from '../common/enums';
import { normalizarTelefono } from '../common/utils/phone';
import { Notificacion } from './entities/notificacion.entity';
export const WHATSAPP_QUEUE = 'whatsapp';

const ENVIO_PAUSADO = 'Envío desactivado temporalmente: Redis no está en uso.';

@Injectable()
export class NotificacionesService {
  private readonly logger = new Logger(NotificacionesService.name);

  constructor(
    @InjectRepository(Notificacion)
    private readonly repo: Repository<Notificacion>,
    private readonly cfg: ConfigService,
  ) {}

  /**
   * Registra la notificación como fallida mientras el envío por Redis está pausado.
   */
  async encolar(
    tipo: TipoNotificacion,
    telefonoRaw: string | null | undefined,
    mensaje: string,
    ref?: { tipo: string; id: number },
  ) {
    const telefono = normalizarTelefono(
      telefonoRaw,
      this.cfg.get('DEFAULT_COUNTRY_CODE') ?? '591',
    );
    if (!telefono) return null;
    const notif = await this.repo.save(
      this.repo.create({
        tipo,
        telefono,
        mensaje,
        estado: 'Fallido',
        error: ENVIO_PAUSADO,
        referenciaTipo: ref?.tipo ?? null,
        referenciaId: ref?.id ?? null,
      }),
    );
    this.logger.warn(
      `Notificación ${notif.id} guardada sin enviar: Redis está desactivado.`,
    );
    return notif;
  }

  list(estado?: string) {
    return this.repo.find({
      where: estado ? { estado: estado as Notificacion['estado'] } : {},
      order: { id: 'DESC' },
      take: 200,
    });
  }

  async reintentar(id: number) {
    const n = await this.repo.findOne({ where: { id } });
    if (!n) throw new NotFoundException('Notificación no encontrada');
    throw new ServiceUnavailableException(
      `No se puede reintentar la notificación ${n.id}: Redis está desactivado temporalmente.`,
    );
  }
}
