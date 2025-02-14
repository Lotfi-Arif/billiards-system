import Database from "better-sqlite3";
import { BaseService } from "../BaseService";
import Logger from "../../../shared/logger";

class TestService extends BaseService {
  public exposedLogActivity(
    entityType: string,
    entityId: number,
    action: string,
    performedBy: number,
    details?: Record<string, unknown>
  ): void {
    this.logActivity(entityType, entityId, action, performedBy, details);
  }

  public exposedTransaction<T>(callback: () => T): T {
    return this.transaction(callback);
  }

  public exposedPrepareStatement<TParams extends unknown[], TResult>(
    sql: string
  ): Database.Statement<TParams, TResult> {
    return this.prepareStatement(sql);
  }
}

describe("BaseService", () => {
  let db: jest.Mocked<Database.Database>;
  let testService: TestService;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
    db = new Database(":memory:") as jest.Mocked<Database.Database>;
    testService = new TestService(db);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe("logActivity", () => {
    it("should successfully log activity without details", () => {
      const mockRun = jest.fn();
      (db.prepare as jest.Mock).mockReturnValue({ run: mockRun });

      testService.exposedLogActivity("table", 1, "reserve", 123);

      expect(db.prepare).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO activity_logs")
      );
      expect(mockRun).toHaveBeenCalledWith("table", 1, "reserve", 123, null);
    });

    it("should successfully log activity with details", () => {
      const mockRun = jest.fn();
      (db.prepare as jest.Mock).mockReturnValue({ run: mockRun });
      const details = { duration: 60, price: 50 };

      testService.exposedLogActivity("table", 1, "reserve", 123, details);

      expect(db.prepare).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO activity_logs")
      );
      expect(mockRun).toHaveBeenCalledWith(
        "table",
        1,
        "reserve",
        123,
        JSON.stringify(details)
      );
    });

    it("should handle database errors gracefully", () => {
      const mockRun = jest.fn().mockImplementation(() => {
        throw new Error("Database error");
      });
      (db.prepare as jest.Mock).mockReturnValue({ run: mockRun });

      testService.exposedLogActivity("table", 1, "reserve", 123);

      expect(Logger.error).toHaveBeenCalledWith(
        expect.stringContaining("Failed to log activity")
      );
    });

    it("should handle prepare statement errors in logActivity", () => {
      (db.prepare as jest.Mock).mockImplementation(() => {
        throw new Error("Prepare error");
      });

      testService.exposedLogActivity("table", 1, "reserve", 123);

      expect(Logger.error).toHaveBeenCalledWith(
        expect.stringContaining("Failed to log activity")
      );
    });
  });

  describe("transaction", () => {
    it("should successfully execute a transaction", () => {
      const mockCallback = jest.fn().mockReturnValue("result");

      const result = testService.exposedTransaction(mockCallback);

      expect(db.transaction).toHaveBeenCalled();
      expect(mockCallback).toHaveBeenCalled();
      expect(result).toBe("result");
    });

    it("should handle transaction errors", () => {
      const error = new Error("Transaction failed");
      (db.transaction as jest.Mock).mockImplementation(() => {
        throw error;
      });

      expect(() => testService.exposedTransaction(() => "result")).toThrow(
        "Transaction failed"
      );

      expect(Logger.error).toHaveBeenCalledWith(
        expect.stringContaining("Transaction failed")
      );
    });

    it("should handle errors thrown within transaction callback", () => {
      const error = new Error("Callback error");
      const mockCallback = jest.fn().mockImplementation(() => {
        throw error;
      });

      expect(() => testService.exposedTransaction(mockCallback)).toThrow(
        "Callback error"
      );

      expect(Logger.error).toHaveBeenCalledWith(
        expect.stringContaining("Transaction failed")
      );
    });
  });

  describe("prepareStatement", () => {
    it("should successfully prepare a valid SQL statement", () => {
      const mockStatement = {
        run: jest.fn(),
        get: jest.fn(),
        all: jest.fn(),
      };
      (db.prepare as jest.Mock).mockReturnValue(mockStatement);

      const stmt = testService.exposedPrepareStatement("SELECT * FROM test");

      expect(db.prepare).toHaveBeenCalledWith("SELECT * FROM test");
      expect(stmt).toBe(mockStatement);
    });

    it("should throw on invalid SQL", () => {
      (db.prepare as jest.Mock).mockImplementation(() => {
        throw new Error("Invalid SQL");
      });

      expect(() => {
        testService.exposedPrepareStatement("INVALID SQL");
      }).toThrow("Invalid SQL");
    });

    it("should properly handle prepare errors with logging", () => {
      const error = new Error("Prepare error");
      (db.prepare as jest.Mock).mockImplementation(() => {
        throw error;
      });

      expect(() =>
        testService.exposedPrepareStatement("SELECT * FROM test")
      ).toThrow("Prepare error");

      expect(Logger.error).toHaveBeenCalledWith(
        expect.stringContaining("Failed to prepare statement")
      );
    });
  });
});
