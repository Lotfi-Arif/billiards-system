import Database from "better-sqlite3";
import { BaseService } from "./BaseService";
import Logger from "@/shared/logger";
import { DatabaseError } from "@/shared/types/errors";

/**
 * Represents an activity log entry.
 */
export interface ActivityLog {
  id: number;
  entity_type: string;
  entity_id: number;
  action: string;
  performed_by: number;
  details: string | null;
  createdAt: Date;
}

/**
 * ActivityLogService provides methods to retrieve (and possibly manage)
 * activity logs for auditing purposes.
 */
export class ActivityLogService extends BaseService {
  constructor(db: Database.Database) {
    super(db);
    Logger.info("Initializing ActivityLogService");
    this.initializeTable();
  }

  /**
   * Creates the activity_logs table if it does not exist.
   */
  private initializeTable(): void {
    try {
      Logger.info("Initializing activity_logs table schema if not exists");
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS activity_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          entity_type TEXT NOT NULL,
          entity_id INTEGER NOT NULL,
          action TEXT NOT NULL,
          performed_by INTEGER NOT NULL,
          details TEXT,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      Logger.info("activity_logs table schema initialized successfully");
    } catch (error) {
      Logger.error("Failed to initialize activity_logs table: " + error);
      throw new DatabaseError("Failed to initialize activity_logs table", {
        error,
      });
    }
  }

  /**
   * Retrieves all activity log entries.
   *
   * @returns An array of ActivityLog entries.
   * @throws DatabaseError if the query fails.
   */
  async getAllActivityLogs(): Promise<ActivityLog[]> {
    try {
      Logger.info("Fetching all activity logs");
      // Specify the row type as ActivityLog (not ActivityLog[])
      const stmt = this.db.prepare<[], ActivityLog>(`
        SELECT id, entity_type, entity_id, action, performed_by, details, createdAt
        FROM activity_logs
        ORDER BY createdAt DESC
      `);
      const rows = stmt.all(); // rows is ActivityLog[]
      // Convert createdAt from a string to a Date object if necessary.
      return rows.map((row) => ({
        ...row,
        createdAt: new Date(row.createdAt),
      }));
    } catch (error) {
      Logger.error("Error fetching activity logs: " + error);
      throw new DatabaseError("Failed to fetch activity logs", { error });
    }
  }

  /**
   * Retrieves activity logs for a given entity type and identifier.
   *
   * @param entityType - The type of the entity (e.g., "PoolTable", "Session").
   * @param entityId - The unique identifier of the entity.
   * @returns An array of ActivityLog entries for the specified entity.
   * @throws DatabaseError if the query fails.
   */
  async getActivityLogsForEntity(
    entityType: string,
    entityId: number
  ): Promise<ActivityLog[]> {
    try {
      Logger.info(
        `Fetching activity logs for ${entityType} with id ${entityId}`
      );
      const stmt = this.db.prepare<[string, number], ActivityLog>(`
        SELECT id, entity_type, entity_id, action, performed_by, details, createdAt
        FROM activity_logs
        WHERE entity_type = ? AND entity_id = ?
        ORDER BY createdAt DESC
      `);
      const rows = stmt.all(entityType, entityId);
      return rows.map((row) => ({
        ...row,
        createdAt: new Date(row.createdAt),
      }));
    } catch (error) {
      Logger.error("Error fetching activity logs for entity: " + error);
      throw new DatabaseError("Failed to fetch activity logs for entity", {
        error,
      });
    }
  }
}
