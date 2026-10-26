/** Sequential little-endian writer used by the test packet-builder. */
export class ByteWriter {
  readonly bytes: Uint8Array;
  private readonly view: DataView;
  private offset: number;

  constructor(byteLength: number, offset = 0) {
    this.bytes = new Uint8Array(byteLength);
    this.view = new DataView(this.bytes.buffer);
    this.offset = offset;
  }

  get position(): number {
    return this.offset;
  }

  seek(offset: number): this {
    this.offset = offset;
    return this;
  }

  skip(byteLength: number): this {
    this.offset += byteLength;
    return this;
  }

  uint8(value: number): this {
    this.view.setUint8(this.offset, value);
    this.offset += 1;
    return this;
  }

  int8(value: number): this {
    this.view.setInt8(this.offset, value);
    this.offset += 1;
    return this;
  }

  uint16(value: number): this {
    this.view.setUint16(this.offset, value, true);
    this.offset += 2;
    return this;
  }

  uint32(value: number): this {
    this.view.setUint32(this.offset, value, true);
    this.offset += 4;
    return this;
  }

  uint64(value: bigint): this {
    this.view.setBigUint64(this.offset, value, true);
    this.offset += 8;
    return this;
  }

  float(value: number): this {
    this.view.setFloat32(this.offset, value, true);
    this.offset += 4;
    return this;
  }

  double(value: number): this {
    this.view.setFloat64(this.offset, value, true);
    this.offset += 8;
    return this;
  }

  ascii(text: string): this {
    for (const char of text) this.uint8(char.charCodeAt(0));
    return this;
  }
}
