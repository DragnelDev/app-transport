import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import PDFDocument from 'pdfkit';
import { Repository } from 'typeorm';
import { Encomienda } from '../encomiendas/encomienda.entity';
import { Pasajero } from '../pasajeros/pasajero.entity';
import { Salida } from './salida.entity';

@Injectable()
export class ManifiestoService {
  constructor(
    @InjectRepository(Pasajero) private readonly pasajeros: Repository<Pasajero>,
    @InjectRepository(Encomienda) private readonly encomiendas: Repository<Encomienda>,
  ) {}

  async datos(salida: Salida) {
    const [pasajeros, encomiendas] = await Promise.all([
      this.pasajeros.find({ where: { salidaId: salida.id }, order: { numeroAsiento: 'ASC' } }),
      this.encomiendas.find({ where: { salidaId: salida.id }, order: { id: 'ASC' } }),
    ]);
    return { pasajeros, encomiendas };
  }

  /** Genera el Manifiesto Oficial de Viaje en PDF (tamaño carta). */
  async generarPdf(salida: Salida): Promise<Buffer> {
    const { pasajeros, encomiendas } = await this.datos(salida);
    const doc = new PDFDocument({ size: 'LETTER', margin: 40 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    const fin = new Promise<Buffer>((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));

    doc.font('Helvetica-Bold').fontSize(16).text('MANIFIESTO OFICIAL DE VIAJE', { align: 'center' });
    doc.moveDown(0.3).font('Helvetica').fontSize(10).text(`Manifiesto N° ${String(salida.id).padStart(6, '0')}`, { align: 'center' });
    doc.moveDown();

    const fila = (k: string, v: string) => {
      doc.font('Helvetica-Bold').text(`${k}: `, { continued: true }).font('Helvetica').text(v);
    };
    fila('Ruta', `${salida.ruta!.origen} → ${salida.ruta!.destino}`);
    fila('Salida programada', salida.fechaHoraProgramada.toLocaleString('es-BO'));
    fila('Vehículo', `${salida.camioneta!.marcaModelo} · Placa ${salida.camioneta!.placa}`);
    fila('Conductor', salida.camioneta!.choferNombre);
    fila('Capacidad del turno', `${salida.capacidadMaximaTurno} asientos${salida.capacidadMaximaTurno === 8 ? ' (sobrecupo habilitado)' : ''}`);
    fila('Estado', salida.estado);
    doc.moveDown();

    const cols = [40, 75, 270, 360, 450];
    const encabezado = (y: number, titulos: string[]) => {
      doc.font('Helvetica-Bold').fontSize(9);
      titulos.forEach((t, i) => doc.text(t, cols[i], y, { width: (cols[i + 1] ?? 572) - cols[i] - 4 }));
      doc.moveTo(40, y + 13).lineTo(572, y + 13).stroke();
      doc.font('Helvetica').fontSize(9);
      return y + 18;
    };

    doc.font('Helvetica-Bold').fontSize(11).text(`Pasajeros (${pasajeros.length})`, 40);
    let y = encabezado(doc.y + 4, ['Asiento', 'Nombre', 'CI', 'Teléfono', 'Baja en']);
    for (const p of pasajeros) {
      if (y > 700) { doc.addPage(); y = encabezado(50, ['Asiento', 'Nombre', 'CI', 'Teléfono', 'Baja en']); }
      doc.text(String(p.numeroAsiento), cols[0], y, { width: 30 });
      doc.text(p.nombrePasajero, cols[1], y, { width: 190 });
      doc.text(p.documentoIdentidad, cols[2], y, { width: 85 });
      doc.text(p.telefono, cols[3], y, { width: 85 });
      doc.text(p.paradaDestino ?? '-', cols[4], y, { width: 120 });
      y += 15;
    }
    if (!pasajeros.length) { doc.text('Sin pasajeros registrados.', 40, y); y += 15; }

    doc.font('Helvetica-Bold').fontSize(11).text(`Encomiendas (${encomiendas.length})`, 40, y + 12);
    y = encabezado(doc.y + 4, ['Bultos', 'Guía / Contenido', 'Destinatario', 'Teléfono', 'Cobro']);
    for (const e of encomiendas) {
      if (y > 700) { doc.addPage(); y = encabezado(50, ['Bultos', 'Guía / Contenido', 'Destinatario', 'Teléfono', 'Cobro']); }
      doc.text(String(e.cantidadBultos), cols[0], y, { width: 30 });
      doc.text(`${e.codigoGuia} · ${e.descripcion.slice(0, 40)}`, cols[1], y, { width: 190 });
      doc.text(e.destinatarioNombre, cols[2], y, { width: 85 });
      doc.text(e.destinatarioTelefono, cols[3], y, { width: 85 });
      doc.text(e.pagado ? 'Pagado' : `Cobrar Bs ${e.montoCobrado.toFixed(2)}`, cols[4], y, { width: 120 });
      y += 15;
    }
    if (!encomiendas.length) doc.text('Sin encomiendas.', 40, y);

    doc.fontSize(9).text('', 40, Math.max(y + 60, doc.y + 60));
    const yf = doc.y;
    doc.moveTo(60, yf).lineTo(240, yf).stroke().moveTo(340, yf).lineTo(520, yf).stroke();
    doc.text('Firma Conductor', 60, yf + 4, { width: 180, align: 'center' });
    doc.text('Firma Secretaria / Sello', 340, yf + 4, { width: 180, align: 'center' });
    doc.fontSize(7).fillColor('#666').text(`Generado el ${new Date().toLocaleString('es-BO')}`, 40, 760, { align: 'right', width: 532 });

    doc.end();
    return fin;
  }
}
