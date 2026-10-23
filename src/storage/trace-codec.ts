import type { TraceSample } from "@/domain/types";

const V1_FIELDS = 5;
const V2_FIELDS = 8;
const FLOAT = Float32Array.BYTES_PER_ELEMENT;
const V1_BYTES = V1_FIELDS * FLOAT;
const V2_BYTES = V2_FIELDS * FLOAT;
const VERSION_V2 = 2;

/** Packs samples as version 2: uint8 2, then float32 distance, throttle, brake, speed, elapsed, gear, drs, ers. */
export function encodeTrace(samples: readonly TraceSample[]): Uint8Array {
  const bytes = new Uint8Array(1 + samples.length * V2_BYTES);
  bytes[0] = VERSION_V2;
  const view = new DataView(bytes.buffer, bytes.byteOffset + 1, samples.length * V2_BYTES);
  samples.forEach((sample, index) => {
    const offset = index * V2_BYTES;
    view.setFloat32(offset, sample.distanceM, true);
    view.setFloat32(offset + 4, sample.throttle, true);
    view.setFloat32(offset + 8, sample.brake, true);
    view.setFloat32(offset + 12, sample.speedKph, true);
    view.setFloat32(offset + 16, sample.elapsedMs, true);
    view.setFloat32(offset + 20, sample.gear, true);
    view.setFloat32(offset + 24, sample.drs, true);
    view.setFloat32(offset + 28, sample.ers, true);
  });
  return bytes;
}

export function decodeTrace(bytes: Uint8Array): TraceSample[] {
  if (bytes.byteLength >= 1 && bytes[0] === VERSION_V2 && (bytes.byteLength - 1) % V2_BYTES === 0) {
    return read(bytes.subarray(1), V2_BYTES, true);
  }
  if (bytes.byteLength % V1_BYTES === 0) return read(bytes, V1_BYTES, false);
  throw new Error(`Trace blob length ${bytes.byteLength} is not a valid sample multiple`);
}

function read(bytes: Uint8Array, stride: number, v2: boolean): TraceSample[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const samples: TraceSample[] = [];
  for (let offset = 0; offset < bytes.byteLength; offset += stride) {
    samples.push({
      distanceM: view.getFloat32(offset, true),
      throttle: view.getFloat32(offset + 4, true),
      brake: view.getFloat32(offset + 8, true),
      speedKph: view.getFloat32(offset + 12, true),
      elapsedMs: view.getFloat32(offset + 16, true),
      gear: v2 ? view.getFloat32(offset + 20, true) : 0,
      drs: v2 ? view.getFloat32(offset + 24, true) : 0,
      ers: v2 ? view.getFloat32(offset + 28, true) : 0,
    });
  }
  return samples;
}
