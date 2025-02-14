import Database from "better-sqlite3";
import { ActivityLogService } from "../ActivityLogService";
import Logger from "@/shared/logger";
import { DatabaseError } from "@/shared/types/errors";

describe("ActivityLogService", () => {
  let db: jest.Mocked<Database.Database>;
  let service: ActivityLogService;

  beforeEach(() => {
    jest.clearAllMocks();
    db = new Database(":memory:") as jest.Mocked<Database.Database>;
    service = new ActivityLogService(db);
  });

  describe("constructor", () => {
    it("should initialize the service and create table with correct schema", () => {
      expect(Logger.info).toHaveBeenCalledWith(
        "Initializing ActivityLogService"
      );
      expect(db.exec).toHaveBeenCalledWith(
        expect.stringMatching(
          /CREATE TABLE IF NOT EXISTS activity_logs[\s\S]*id INTEGER PRIMARY KEY AUTOINCREMENT[\s\S]*entity_type TEXT NOT NULL[\s\S]*entity_id INTEGER NOT NULL[\s\S]*action TEXT NOT NULL[\s\S]*performed_by INTEGER NOT NULL[\s\S]*details TEXT[\s\S]*createdAt DATETIME/
        )
      );
      expect(Logger.info).toHaveBeenCalledWith(
        "activity_logs table schema initialized successfully"
      );
    });

    it("should handle initialization errors properly", () => {
      const error = new Error("DB Error");
      (db.exec as jest.Mock).mockImplementationOnce(() => {
        throw error;
      });

      expect(() => new ActivityLogService(db)).toThrow(DatabaseError);
      expect(Logger.error).toHaveBeenCalledWith(
        expect.stringContaining("Failed to initialize activity_logs table")
      );
    });
  });

  describe("getAllActivityLogs", () => {
    const mockLogs = [
      {
        id: 1,
        entity_type: "table",
        entity_id: 1,
        action: "create",
        performed_by: 123,
        details: "test details",
        createdAt: "2024-02-11T12:00:00.000Z",
      },
      {
        id: 2,
        entity_type: "session",
        entity_id: 2,
        action: "start",
        performed_by: 456,
        details: null,
        createdAt: "2024-02-11T13:00:00.000Z",
      },
    ];

    it("should return all activity logs with proper date conversion", async () => {
      (db.prepare as jest.Mock).mockReturnValueOnce({
        all: jest.fn().mockReturnValue(mockLogs),
      });

      const result = await service.getAllActivityLogs();

      expect(db.prepare).toHaveBeenCalledWith(
        expect.stringMatching(
          /SELECT[\s\S]*FROM activity_logs[\s\S]*ORDER BY createdAt DESC/
        )
      );
      expect(result).toHaveLength(2);
      expect(result[0].createdAt).toBeInstanceOf(Date);
      expect(result[0].createdAt.toISOString()).toBe(mockLogs[0].createdAt);
      expect(result[1].createdAt.toISOString()).toBe(mockLogs[1].createdAt);

      // Verify all fields are properly mapped
      expect(result[0]).toEqual({
        ...mockLogs[0],
        createdAt: new Date(mockLogs[0].createdAt),
      });
    });

    it("should handle null values in all nullable fields", async () => {
      const logsWithNulls = [
        {
          id: 1,
          entity_type: "table",
          entity_id: 1,
          action: "create",
          performed_by: 123,
          details: null,
          createdAt: "2024-02-11T12:00:00.000Z",
        },
      ];

      (db.prepare as jest.Mock).mockReturnValueOnce({
        all: jest.fn().mockReturnValue(logsWithNulls),
      });

      const result = await service.getAllActivityLogs();
      expect(result[0].details).toBeNull();
    });

    it("should handle database errors when fetching all logs", async () => {
      const error = new Error("DB Error");
      (db.prepare as jest.Mock).mockImplementationOnce(() => {
        throw error;
      });

      const promise = service.getAllActivityLogs();

      await expect(promise).rejects.toThrow(DatabaseError);
      await expect(promise).rejects.toHaveProperty("details.error", error);
      expect(Logger.error).toHaveBeenCalledWith(
        expect.stringContaining("Error fetching activity logs")
      );
    });

    it("should return empty array when no logs exist", async () => {
      (db.prepare as jest.Mock).mockReturnValueOnce({
        all: jest.fn().mockReturnValue([]),
      });

      const result = await service.getAllActivityLogs();
      expect(result).toEqual([]);
      expect(Logger.info).toHaveBeenCalledWith("Fetching all activity logs");
    });
  });

  describe("getActivityLogsForEntity", () => {
    const mockEntityLogs = [
      {
        id: 1,
        entity_type: "table",
        entity_id: 1,
        action: "create",
        performed_by: 123,
        details: "test details",
        createdAt: "2024-02-11T12:00:00.000Z",
      },
    ];

    it("should return activity logs for specific entity with proper params", async () => {
      const mockAll = jest.fn().mockReturnValue(mockEntityLogs);
      (db.prepare as jest.Mock).mockReturnValueOnce({ all: mockAll });

      const result = await service.getActivityLogsForEntity("table", 1);

      expect(db.prepare).toHaveBeenCalledWith(
        expect.stringMatching(
          /SELECT[\s\S]*WHERE entity_type = \? AND entity_id = \?[\s\S]*ORDER BY createdAt DESC/
        )
      );
      expect(mockAll).toHaveBeenCalledWith("table", 1);
      expect(result[0].createdAt).toBeInstanceOf(Date);

      // Verify the complete structure
      expect(result[0]).toEqual({
        ...mockEntityLogs[0],
        createdAt: new Date(mockEntityLogs[0].createdAt),
      });
    });

    it("should properly handle different entity types and IDs", async () => {
      const testCases = [
        { type: "session", id: 999 },
        { type: "user", id: 123 },
        { type: "payment", id: 456 },
      ];

      for (const testCase of testCases) {
        const mockAll = jest.fn().mockReturnValue([]);
        (db.prepare as jest.Mock).mockReturnValueOnce({ all: mockAll });

        await service.getActivityLogsForEntity(testCase.type, testCase.id);
        expect(mockAll).toHaveBeenCalledWith(testCase.type, testCase.id);
        expect(Logger.info).toHaveBeenCalledWith(
          expect.stringContaining(`Fetching activity logs for ${testCase.type}`)
        );
      }
    });

    it("should handle database errors when fetching entity logs", async () => {
      const error = new Error("DB Error");
      (db.prepare as jest.Mock).mockImplementationOnce(() => {
        throw error;
      });

      const promise = service.getActivityLogsForEntity("table", 1);

      await expect(promise).rejects.toThrow(DatabaseError);
      await expect(promise).rejects.toHaveProperty("details.error", error);
      expect(Logger.error).toHaveBeenCalledWith(
        expect.stringContaining("Error fetching activity logs for entity")
      );
    });

    it("should return empty array when no logs found for entity", async () => {
      (db.prepare as jest.Mock).mockReturnValueOnce({
        all: jest.fn().mockReturnValue([]),
      });

      const result = await service.getActivityLogsForEntity("table", 999);
      expect(result).toEqual([]);
    });

    it("should properly order logs by createdAt DESC", async () => {
      const orderedLogs = [
        { ...mockEntityLogs[0], id: 2, createdAt: "2024-02-11T13:00:00.000Z" },
        { ...mockEntityLogs[0], id: 1, createdAt: "2024-02-11T12:00:00.000Z" },
      ];

      (db.prepare as jest.Mock).mockReturnValueOnce({
        all: jest.fn().mockReturnValue(orderedLogs),
      });

      const result = await service.getActivityLogsForEntity("table", 1);
      expect(result[0].id).toBe(2);
      expect(result[1].id).toBe(1);
      expect(result[0].createdAt.getTime()).toBeGreaterThan(
        result[1].createdAt.getTime()
      );
    });

    it("should handle invalid or edge case inputs", async () => {
      const mockAll = jest.fn().mockReturnValue([]);
      (db.prepare as jest.Mock).mockReturnValueOnce({ all: mockAll });

      await service.getActivityLogsForEntity("", 0);
      expect(mockAll).toHaveBeenCalledWith("", 0);

      (db.prepare as jest.Mock).mockReturnValueOnce({ all: mockAll });
      await service.getActivityLogsForEntity("table", -1);
      expect(mockAll).toHaveBeenCalledWith("table", -1);
    });
  });
});
