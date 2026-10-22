import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import { TipoNotificacion } from '../common/enums';
import { normalizarTelefono } from '../common/utils/phone';
import { Notificacion } from './notificacion.entity';

export const WHATSAPP_QUEUE = 'whatsapp';

@Injectable()
export class NotificacionesService {
  private readonly logger = new Logger(NotificacionesService.name);

  constructor(
    @InjectRepository(Notificacion) private readonly repo: Repository<Notificacion>,
    @InjectQueue(WHATSAPP_QUEUE) private readonly queue: Queue,
    private readonly cfg: ConfigService,
  ) {}

  /**
   * Registra la notificación y la encola. Nunca lanza: un fallo de mensajería
   * no debe interrumpir una venta o un cambio de estado.
   */
  async encolar(
    tipo: TipoNotificacion,
    telefonoRaw: string | null | undefined,
    mensaje: string,
    ref?: { tipo: string; id: number },
  ) {
    const telefono = normalizarTelefono(telefonoRaw, this.cfg.get('DEFAULT_COUNTRY_CODE') ?? '591');
    if (!telefono) return null;
    const notif = await this.repo.save(
      this.repo.create({
        tipo,
        telefono,
        mensaje,
        referenciaTipo: ref?.tipo ?? null,
        referenciaId: ref?.id ?? null,
      }),
    );
    await this.publicar(notif);
    return notif;
  }

  private async publicar(n: Notificacion) {
    try {
      await this.queue.add(
        'enviar',
        { notificacionId: n.id },
        { attempts: 5, backoff: { type: 'exponential', delay: 5000 }, removeOnComplete: 500, removeOnFail: 1000 },
      );
    } catch (err) {
      this.logger.error(`No se pudo encolar la notificación ${n.id}: ${(err as Error).message}`);
      await this.repo.update(n.id, { estado: 'Fallido', error: `Cola no disponible: ${(err as Error).message}` });
    }
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
    await this.repo.update(id, { estado: 'Pendiente', error: null });
    await this.publicar(n);
    return this.repo.findOne({ where: { id } });
  }
}
