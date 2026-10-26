/** Schema steps in order; step N moves PRAGMA user_version from N to N + 1. Never edit a shipped step. */
export const MIGRATIONS: readonly string[] = [
  `
  CREATE TABLE sessions (
    id INTEGER PRIMARY KEY,
    game TEXT NOT NULL,
    session_uid TEXT NOT NULL,
    track_id INTEGER NOT NULL,
    session_type INTEGER NOT NULL,
    started_at INTEGER NOT NULL,
    UNIQUE (game, session_uid)
  );
  CREATE TABLE laps (
    id INTEGER PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES sessions (id),
    game TEXT NOT NULL,
    track_id INTEGER NOT NULL,
    condition TEXT NOT NULL,
    lap_number INTEGER NOT NULL,
    lap_time_ms INTEGER NOT NULL,
    sector1_ms INTEGER NOT NULL,
    sector2_ms INTEGER NOT NULL,
    sector3_ms INTEGER NOT NULL,
    tyre_compound INTEGER NOT NULL,
    track_temp_c REAL NOT NULL,
    air_temp_c REAL NOT NULL,
    setup_json TEXT NOT NULL,
    finished_at INTEGER NOT NULL
  );
  CREATE TABLE traces (
    lap_id INTEGER PRIMARY KEY REFERENCES laps (id) ON DELETE CASCADE,
    samples BLOB NOT NULL
  );
  CREATE INDEX laps_group_lap_time ON laps (game, track_id, condition, lap_time_ms);
  CREATE INDEX laps_finished_at ON laps (finished_at);
  `,
  `
  ALTER TABLE sessions ADD COLUMN game_mode INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE laps ADD COLUMN team_id INTEGER NOT NULL DEFAULT 0;
  `,
  `
  ALTER TABLE sessions ADD COLUMN result_status INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE sessions ADD COLUMN position INTEGER NOT NULL DEFAULT 0;
  `,
  `
  ALTER TABLE laps ADD COLUMN valid INTEGER NOT NULL DEFAULT 1;
  `,
  `
  ALTER TABLE sessions ADD COLUMN ai_difficulty INTEGER NOT NULL DEFAULT -1;
  ALTER TABLE sessions ADD COLUMN grid_position INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE sessions ADD COLUMN pit_stops INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE sessions ADD COLUMN total_race_time_ms INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE laps ADD COLUMN tyre_age_laps INTEGER NOT NULL DEFAULT 0;
  `,
  `
  ALTER TABLE laps ADD COLUMN visual_tyre_compound INTEGER NOT NULL DEFAULT 0;
  `,
  `
  ALTER TABLE laps ADD COLUMN invalid_reason TEXT NOT NULL DEFAULT '';
  `,
  `
  ALTER TABLE sessions ADD COLUMN uuid TEXT NOT NULL DEFAULT '';
  ALTER TABLE laps ADD COLUMN uuid TEXT NOT NULL DEFAULT '';
  UPDATE sessions SET uuid = lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6))) WHERE uuid = '';
  UPDATE laps SET uuid = lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6))) WHERE uuid = '';
  CREATE UNIQUE INDEX sessions_uuid ON sessions (uuid);
  CREATE UNIQUE INDEX laps_uuid ON laps (uuid);
  `,
];

export interface MigratableDatabase {
  getFirstAsync<T>(source: string): Promise<T | null>;
  execAsync(source: string): Promise<void>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}

/** Runs every step above the database's user_version, each in its own transaction. */
export async function migrate(
  db: MigratableDatabase,
  migrations: readonly string[] = MIGRATIONS,
): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version");
  const current = row?.user_version ?? 0;
  for (let version = current; version < migrations.length; version++) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(migrations[version]!);
      await db.execAsync(`PRAGMA user_version = ${version + 1}`);
    });
  }
}
