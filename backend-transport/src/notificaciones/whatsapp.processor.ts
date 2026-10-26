import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { Repository } from 'typeorm';
import { WHATSAPP_QUEUE } from './notificaciones.service';
import { WhatsappProvider } from './whatsapp.provider';
import { Notificacion } from './entities/notificacion.entity';

/** Worker en segundo plano que envía los mensajes de la cola. */
@Processor(WHATSAPP_QUEUE, { concurrency: 2 })
export class WhatsappProcessor extends WorkerHost {
  private readonly logger = new Logger(WhatsappProcessor.name);

  constructor(
    @InjectRepository(Notificacion)
    private readonly repo: Repository<Notificacion>,
    private readonly provider: WhatsappProvider,
  ) {
    super();
  }

  async process(job: Job<{ notificacionId: number }>) {
    const n = await this.repo.findOne({
      where: { id: job.data.notificacionId },
    });
    if (!n || n.estado === 'Enviado') return;
    const intentos = n.intentos + 1;
    try {
      await this.provider.enviar(n.telefono, n.mensaje);
      await this.repo.update(n.id, {
        estado: 'Enviado',
        intentos,
        error: null,
        sentAt: new Date(),
      });
    } catch (err) {
      const final = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
      await this.repo.update(n.id, {
        intentos,
        estado: final ? 'Fallido' : 'Pendiente',
        error: (err as Error).message,
      });
      this.logger.warn(
        `Fallo al enviar notificación ${n.id}: ${(err as Error).message}`,
      );
      throw err; // BullMQ reintenta con backoff
    }
  }
}
