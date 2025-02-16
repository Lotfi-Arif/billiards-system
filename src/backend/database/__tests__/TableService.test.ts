import {
  describe,
  it,
  expect,
  beforeEach,
  vi,
  afterEach,
  beforeAll,
  afterAll,
} from "vitest";
import Database from "better-sqlite3";
import { TableService } from "../TableService";
import { TableStatus } from "@/shared/types/Table";
import { DatabaseError, PermissionError } from "@/shared/types/errors";

describe("TableService", () => {
  let tableService: TableService;
  let db: Database.Database;

  beforeAll(() => {
    // Reset mock date before all tests
    vi.useFakeTimers();
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  beforeEach(async () => {
    // Create a new database connection for each test
    db = new Database(":memory:");
    tableService = new TableService(db);

    // Wait for initialization to complete
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  afterEach(() => {
    if (db) {
      // Properly close the database connection
      try {
        db.close();
      } catch (error) {
        console.error("Error closing database:", error);
      }
    }
  });

  describe("Table Creation", () => {
    it("should create a table with default values", async () => {
      const table = await tableService.createTable({
        tableNumber: 1,
        hourlyRate: 5.0,
      });

      expect(table).toMatchObject({
        tableNumber: 1,
        hourlyRate: 5.0,
        condition: "Good",
        status: TableStatus.OFF,
        isActive: true,
        lightState: false,
      });
      expect(table.id).toBeDefined();
    });

    it("should not allow duplicate table numbers", async () => {
      await tableService.createTable({
        tableNumber: 1,
        hourlyRate: 5.0,
      });

      await expect(
        tableService.createTable({
          tableNumber: 1,
          hourlyRate: 5.0,
        })
      ).rejects.toThrow(DatabaseError);
    });
  });

  describe("Session Management", () => {
    let tableId: number;

    beforeEach(async () => {
      const table = await tableService.createTable({
        tableNumber: 1,
        hourlyRate: 5.0,
      });
      tableId = table.id;
    });

    it("should start a new session", async () => {
      const session = await tableService.startSession(tableId, 1); // staffId = 1

      expect(session).toMatchObject({
        tableId,
        staffId: 1,
        status: "ACTIVE",
      });

      const updatedTable = await tableService.getTableById(tableId);
      expect(updatedTable.status).toBe(TableStatus.IN_USE);
      expect(updatedTable.lightState).toBe(true);
    });

    it("should not start session during prayer time", async () => {
      await tableService.setPrayerCooldown(30);
      await expect(tableService.startSession(tableId, 1)).rejects.toThrow(
        PermissionError
      );
    });

    it("should end session and calculate correct amount", async () => {
      const startTime = new Date("2024-02-15T10:00:00");
      const endTime = new Date("2024-02-15T11:30:00"); // 1.5 hours

      vi.setSystemTime(startTime);
      const session = await tableService.startSession(tableId, 1);

      vi.setSystemTime(endTime);
      const endedSession = await tableService.endSession(session.id, 1);

      expect(endedSession).toMatchObject({
        status: "COMPLETED",
        totalAmount: 8, // 1.5 hours * 5.0 LYD = 7.5 LYD, rounded up to 8
      });

      const updatedTable = await tableService.getTableById(tableId);
      expect(updatedTable.status).toBe(TableStatus.AVAILABLE);
      expect(updatedTable.lightState).toBe(false);
    });
  });

  describe("Prayer Time Management", () => {
    let table1Id: number;
    let table2Id: number;

    beforeEach(async () => {
      const table1 = await tableService.createTable({
        tableNumber: 1,
        hourlyRate: 5.0,
      });
      const table2 = await tableService.createTable({
        tableNumber: 2,
        hourlyRate: 5.0,
      });
      table1Id = table1.id;
      table2Id = table2.id;
    });

    it("should set prayer cooldown for active tables", async () => {
      // Start sessions for both tables
      await tableService.startSession(table1Id, 1);
      await tableService.startSession(table2Id, 1);

      // Set prayer cooldown
      await tableService.setPrayerCooldown(30);

      const tables = await tableService.getAllTables();
      for (const table of tables) {
        if (table.status === TableStatus.IN_USE) {
          expect(table.status).toBe(TableStatus.PRAYER_COOLDOWN);
          expect(table.lightState).toBe(false);
          expect(table.prayerCooldownEnd).toBeDefined();
        }
      }
    });

    it("should handle prayer cooldown status correctly", async () => {
      await tableService.startSession(table1Id, 1);

      const currentTime = new Date("2024-02-15T12:00:00");
      vi.setSystemTime(currentTime);

      await tableService.setPrayerCooldown(30);
      expect(await tableService.checkPrayerCooldown()).toBe(true);

      // Move time forward past cooldown
      vi.setSystemTime(new Date(currentTime.getTime() + 31 * 60000));
      expect(await tableService.checkPrayerCooldown()).toBe(false);
    });
  });
});
