/** Constructor mínimo de comandos ESC/POS para impresoras térmicas (58/80mm). */
export class EscPos {
  private chunks: Buffer[] = [];

  constructor(private readonly columnas = 32) {
    this.raw([0x1b, 0x40]); // initialize
  }

  private raw(bytes: number[] | Buffer): this {
    this.chunks.push(Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes));
    return this;
  }

  align(a: 'left' | 'center' | 'right'): this {
    return this.raw([0x1b, 0x61, { left: 0, center: 1, right: 2 }[a]]);
  }

  bold(on: boolean): this {
    return this.raw([0x1b, 0x45, on ? 1 : 0]);
  }

  size(doble: boolean): this {
    return this.raw([0x1d, 0x21, doble ? 0x11 : 0x00]);
  }

  text(t: string): this {
    // Se quitan acentos/ñ para compatibilidad con la code page por defecto
    const limpio = t.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return this.raw(Buffer.from(limpio + '\n', 'ascii'));
  }

  line(): this {
    return this.text('-'.repeat(this.columnas));
  }

  /** Imprime "izquierda ........ derecha" ajustado a las columnas. */
  pair(izq: string, der: string): this {
    const espacio = Math.max(1, this.columnas - izq.length - der.length);
    return this.text(izq + ' '.repeat(espacio) + der);
  }

  feed(n = 1): this {
    return this.raw([0x1b, 0x64, n]);
  }

  qr(data: string, moduleSize = 6): this {
    const d = Buffer.from(data, 'ascii');
    const len = d.length + 3;
    this.raw([0x1d, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00]); // modelo 2
    this.raw([0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, moduleSize]); // tamaño
    this.raw([0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x31]); // corrección M
    this.raw(
      Buffer.concat([
        Buffer.from([0x1d, 0x28, 0x6b, len & 0xff, len >> 8, 0x31, 0x50, 0x30]),
        d,
      ]),
    );
    return this.raw([0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30]); // imprimir
  }

  cut(): this {
    return this.feed(3).raw([0x1d, 0x56, 0x42, 0x00]);
  }

  build(): Buffer {
    return Buffer.concat(this.chunks);
  }
}
