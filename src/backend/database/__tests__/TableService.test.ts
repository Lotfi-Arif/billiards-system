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
import { TableService } from "../TableService";
import { TableStatus } from "@/shared/types/Table";
import { DatabaseError, PermissionError } from "@/shared/types/errors";
// Mock Logger
vi.mock("@/shared/logger", () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock better-sqlite3
vi.mock("better-sqlite3", () => {
  const mockStmt = {
    run: vi.fn(),
    get: vi.fn(),
    all: vi.fn(),
  };

  class MockDatabase {
    exec = vi.fn();
    prepare = vi.fn(() => mockStmt);
    transaction = vi.fn((fn) => fn());
    close = vi.fn();
    pragma = vi.fn().mockReturnValue([{ foreign_keys: 1 }]);

    constructor() {
      // Default mock implementation for initial table fetch
      mockStmt.all.mockReturnValue([]);
    }
  }

  return { default: MockDatabase };
});

describe("TableService", () => {
  let tableService: TableService;
  let db: any;
  let mockStmt: any;

  beforeAll(() => {
    vi.useFakeTimers();
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  beforeEach(async () => {
    const Database = (await import("better-sqlite3")).default;
    db = new Database();
    mockStmt = db.prepare();

    // Reset all mock implementations before each test
    mockStmt.all.mockReset().mockReturnValue([]);
    mockStmt.get.mockReset();
    mockStmt.run
      .mockReset()
      .mockReturnValue({ lastInsertRowid: 1, changes: 1 });

    tableService = new TableService(db);
  });

  afterEach(() => {
    vi.clearAllMocks();
    if (db) {
      db.close();
    }
  });

  describe("Table Management", () => {
    it("should create a table with default values", async () => {
      const mockTableData = {
        id: 1,
        tableNumber: 1,
        hourlyRate: 5.0,
        condition: "Good",
        status: TableStatus.OFF,
        isActive: true,
        lightState: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastMaintenance: null as Date | null,
        prayerCooldownEnd: null as Date | null,
        currentSession: null as string | null,
      };

      mockStmt.run.mockReturnValueOnce({ lastInsertRowid: 1 });
      mockStmt.get.mockReturnValueOnce(mockTableData);

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
    });

    it("should get table by id", async () => {
      const mockTable = {
        id: 1,
        tableNumber: 1,
        status: TableStatus.AVAILABLE,
        hourlyRate: 5.0,
        condition: "Good",
        isActive: 1,
        lightState: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockStmt.get.mockReturnValueOnce(mockTable);

      const table = await tableService.getTableById(1);
      expect(table.id).toBe(1);
      expect(table.status).toBe(TableStatus.AVAILABLE);
    });

    it("should not allow duplicate table numbers", async () => {
      mockStmt.run.mockImplementationOnce(() => {
        throw new Error("UNIQUE constraint failed: tables.tableNumber");
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
    const mockTable = {
      id: 1,
      tableNumber: 1,
      status: TableStatus.AVAILABLE,
      hourlyRate: 5.0,
      condition: "Good",
      isActive: 1,
      lightState: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    it("should start a new session", async () => {
      const mockSession = {
        id: 1,
        tableId: 1,
        staffId: 1,
        customerId: null as number | null,
        startTime: new Date().toISOString(),
        endTime: null as string | null,
        totalAmount: null as number | null,
        status: "ACTIVE",
      };

      mockStmt.get
        .mockReturnValueOnce(mockTable) // For getTableById
        .mockReturnValueOnce(mockSession); // For getSessionById
      mockStmt.run.mockReturnValueOnce({ lastInsertRowid: 1 });

      const session = await tableService.startSession(1, 1);

      expect(session).toMatchObject({
        tableId: 1,
        staffId: 1,
        status: "ACTIVE",
      });
    });

    it("should not start session during prayer time", async () => {
      const prayerTable = { ...mockTable, status: TableStatus.PRAYER_COOLDOWN };
      mockStmt.get.mockReturnValueOnce(prayerTable);

      await expect(tableService.startSession(1, 1)).rejects.toThrow(
        PermissionError
      );
    });
  });

  describe("Prayer Time Management", () => {
    it("should set prayer cooldown for active tables", async () => {
      const currentTime = new Date("2024-02-15T12:00:00");
      vi.setSystemTime(currentTime);

      await tableService.setPrayerCooldown(30);

      expect(mockStmt.run).toHaveBeenCalledWith(
        TableStatus.PRAYER_COOLDOWN,
        expect.any(String),
        TableStatus.IN_USE
      );
    });

    it("should check prayer cooldown status correctly", async () => {
      mockStmt.get.mockReturnValueOnce({ count: 1 });
      expect(await tableService.checkPrayerCooldown()).toBe(true);

      mockStmt.get.mockReturnValueOnce({ count: 0 });
      expect(await tableService.checkPrayerCooldown()).toBe(false);
    });
  });
});
