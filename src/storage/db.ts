import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";

import { migrate } from "./migrations";

const DATABASE_NAME = "f1-hotlaps.db";

let opening: Promise<SQLiteDatabase> | null = null;

/** Opens and migrates the database once per app run. */
export function getDatabase(): Promise<SQLiteDatabase> {
  opening ??= open().catch((error: unknown) => {
    opening = null;
    throw error;
  });
  return opening;
}

async function open(): Promise<SQLiteDatabase> {
  const db = await openDatabaseAsync(DATABASE_NAME);
  await db.execAsync("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  await migrate(db);
  return db;
}
