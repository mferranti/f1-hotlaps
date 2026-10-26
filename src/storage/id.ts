const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** A new id for a Session or Lap. */
export function newUuid(): string {
  return crypto.randomUUID();
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}
