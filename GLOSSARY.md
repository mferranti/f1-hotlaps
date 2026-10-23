# Hotlaps

On-device record of the player's completed laps from EA SPORTS F1 25 and F1 26, received on the same network.

## Language

### Receiving

**Game**:
EA SPORTS F1 25 or EA SPORTS F1 26, whichever produced the lap.
_Avoid_: Packet format, season, title

**Packet**:
One UDP message sent by the Game.
_Avoid_: Package, datagram, frame, message

**Packet rate**:
How many Packets arrive per second.
_Avoid_: Packages per second, throughput, bandwidth

**Receiving**:
The state of the app while at least one Packet has arrived in the last 2 seconds. Otherwise the app is **Waiting**.
_Avoid_: Connected, online, live

**Player car**:
The car the person is driving. Other cars in the session are ignored.
_Avoid_: Spectator car, AI car, field

### Laps

**Session**:
One outing on one track: a practice, qualifying, race, or time trial. Every Lap belongs to exactly one Session.
_Avoid_: Recording, capture, run

**Race**:
A Session in which cars compete over a set number of laps, as opposed to practice, qualifying, or time trial.
_Avoid_: Career, Grand Prix

**Lap**:
A completed circuit of the track by the Player car that the Game counts as valid, with a lap time above zero.
_Avoid_: Incomplete lap, invalid lap, sector

**Condition**:
The track's wetness when a Lap finishes: Dry or Wet.
_Avoid_: Weather, forecast

**Dry**:
Clear, light cloud, or overcast.
_Avoid_: Slick, dry compound

**Wet**:
Light rain, heavy rain, or storm.
_Avoid_: Rain, intermediate, wet compound

### Traces

**Fastest**:
The Lap with the lowest lap time for one Game, track, and Condition. On a tie, the earlier Lap stays Fastest.
_Avoid_: Best, PB, record

**Latest**:
The most recent Lap for one Game, track, and Condition that is not the Fastest.
_Avoid_: Last, previous, newest

**Trace**:
Throttle, brake, speed, gear, DRS, ERS, and time delta along a Lap. By default every Lap keeps one; Config can keep Traces only on the Fastest and the Latest.
_Avoid_: Telemetry log, recording, replay
