import { migrate, type MigratableDatabase } from "./migrations";

class MemoryDb implements MigratableDatabase {
  userVersion = 0;
  executed: string[] = [];

  async getFirstAsync<T>(source: string): Promise<T | null> {
    if (source === "PRAGMA user_version") return { user_version: this.userVersion } as T;
    return null;
  }

  async execAsync(source: string): Promise<void> {
    const match = source.match(/PRAGMA user_version = (\d+)/);
    if (match) {
      this.userVersion = Number(match[1]);
      return;
    }
    this.executed.push(source);
  }

  async withTransactionAsync(task: () => Promise<void>): Promise<void> {
    await task();
  }
}

describe("migrate", () => {
  it("runs each new step once and records user_version", async () => {
    const db = new MemoryDb();
    await migrate(db, ["CREATE TABLE a (id INTEGER)", "CREATE TABLE b (id INTEGER)"]);
    expect(db.executed).toHaveLength(2);
    expect(db.userVersion).toBe(2);
    await migrate(db, ["CREATE TABLE a (id INTEGER)", "CREATE TABLE b (id INTEGER)", "CREATE TABLE c (id INTEGER)"]);
    expect(db.executed).toHaveLength(3);
    expect(db.userVersion).toBe(3);
  });
});
