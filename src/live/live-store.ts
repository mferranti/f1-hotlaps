import type { Game } from "@/domain/types";

export interface LiveCar {
  game: Game;
  trackId: number;
  sessionType: number;
  lapNumber: number;
  currentLapTimeMs: number;
  speedKph: number;
  throttle: number;
  brake: number;
  teamId?: number;
  myTeam?: boolean;
}

type Listener = () => void;

let car: LiveCar | null = null;
const listeners = new Set<Listener>();

export function setLiveCar(next: LiveCar | null): void {
  car = next;
  listeners.forEach((listen) => listen());
}

export function getLiveCar(): LiveCar | null {
  return car;
}

export function subscribeLiveCar(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
