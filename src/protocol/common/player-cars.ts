import type { ByteReader } from "../byte-reader";

/** Read only the player's car slot. Other indices stay empty. */
export function readPlayerCars<T>(
  reader: ByteReader,
  numCars: number,
  playerCarIndex: number,
  carBytes: number,
  read: () => T,
): T[] {
  const cars = new Array<T>(numCars);
  if (playerCarIndex < 0 || playerCarIndex >= numCars) return cars;
  reader.skip(playerCarIndex * carBytes);
  cars[playerCarIndex] = read();
  return cars;
}
