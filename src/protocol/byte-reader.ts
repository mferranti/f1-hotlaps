/** Sequential little-endian reader over a packed Packet. */
export class ByteReader {
  private readonly view: DataView;
  private offset: number;

  constructor(bytes: Uint8Array, offset = 0) {
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    this.offset = offset;
  }

  skip(byteLength: number): void {
    this.offset += byteLength;
  }

  uint8(): number {
    const value = this.view.getUint8(this.offset);
    this.offset += 1;
    return value;
  }

  int8(): number {
    const value = this.view.getInt8(this.offset);
    this.offset += 1;
    return value;
  }

  uint16(): number {
    const value = this.view.getUint16(this.offset, true);
    this.offset += 2;
    return value;
  }

  uint32(): number {
    const value = this.view.getUint32(this.offset, true);
    this.offset += 4;
    return value;
  }

  uint64(): bigint {
    const value = this.view.getBigUint64(this.offset, true);
    this.offset += 8;
    return value;
  }

  float(): number {
    const value = this.view.getFloat32(this.offset, true);
    this.offset += 4;
    return value;
  }

  double(): number {
    const value = this.view.getFloat64(this.offset, true);
    this.offset += 8;
    return value;
  }

  bool(): boolean {
    return this.uint8() === 1;
  }

  ascii(length: number): string {
    return String.fromCharCode(...this.array(length, () => this.uint8()));
  }

  /** A time split into a uint16 milliseconds part followed by a uint8 whole-minutes part. */
  splitTimeMs(): number {
    const ms = this.uint16();
    return this.uint8() * 60_000 + ms;
  }

  array<T>(length: number, read: () => T): T[] {
    return Array.from({ length }, read);
  }
}
