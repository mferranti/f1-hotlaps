export const DEFAULT_TELEMETRY_PORT = 20777;

export type StopListening = () => void;

/**
 * Listens with react-native-udp. Loaded only when capture starts so Expo Go can
 * still open the rest of the app; the native module exists only in a dev build.
 */
export async function listenUdp(port: number, onPacket: (bytes: Uint8Array) => void): Promise<StopListening> {
  const { default: dgram } = await import("react-native-udp");
  const socket = dgram.createSocket({ type: "udp4" });
  return new Promise((resolve, reject) => {
    socket.once("error", reject);
    socket.on("message", (msg: Uint8Array) => onPacket(msg));
    socket.bind(port, () => resolve(() => socket.close()));
  });
}
