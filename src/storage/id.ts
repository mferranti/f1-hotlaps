const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

let lastMs = 0;
let counter = 0;

/** A new UUID version 7. Time comes first, so later ids sort after earlier ones. Hermes has no crypto. */
export function newUuid(): string {
  let ms = Date.now();
  if (ms > lastMs) {
    lastMs = ms;
    counter = Math.floor(Math.random() * 0x1000);
  } else {
    ms = lastMs;
    counter += 1;
    if (counter > 0xfff) {
      lastMs += 1;
      ms = lastMs;
      counter = 0;
    }
  }

  const bytes = new Uint8Array(16);
  bytes[0] = Math.floor(ms / 2 ** 40) & 0xff;
  bytes[1] = Math.floor(ms / 2 ** 32) & 0xff;
  bytes[2] = Math.floor(ms / 2 ** 24) & 0xff;
  bytes[3] = Math.floor(ms / 2 ** 16) & 0xff;
  bytes[4] = Math.floor(ms / 2 ** 8) & 0xff;
  bytes[5] = ms & 0xff;
  bytes[6] = 0x70 | ((counter >> 8) & 0x0f);
  bytes[7] = counter & 0xff;
  bytes[8] = 0x80 | (randomByte() & 0x3f);
  for (let i = 9; i < 16; i++) bytes[i] = randomByte();

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

function randomByte(): number {
  return Math.floor(Math.random() * 256);
}
