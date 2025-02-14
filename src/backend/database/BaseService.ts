import Logger from "../../shared/logger";
import Database from "better-sqlite3";

/**
 * BaseService provides common database operations that other services can inherit.
 * It includes helper methods for logging activities, handling transactions, and preparing statements.
 */
export abstract class BaseService {
  protected db: Database.Database;
  protected static migrationsSql = `
    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL,
      entity_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      performed_by INTEGER NOT NULL,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;

  constructor(db: Database.Database) {
    this.db = db;
    this.initializeDatabase();
  }

  /**
   * Initializes the database with required tables and settings.
   */
  private initializeDatabase(): void {
    try {
      // Enable foreign keys
      this.db.pragma("foreign_keys = ON");

      // Use WAL mode for better concurrency
      this.db.pragma("journal_mode = WAL");

      // Run migrations
      this.db.exec(BaseService.migrationsSql);

      Logger.info(`Database initialized successfully`);
    } catch (error) {
      Logger.error("Failed to initialize database:", error);
      throw new Error(
        `Database initialization failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Logs an activity to the `activity_logs` table.
   */
  protected logActivity(
    entityType: string,
    entityId: number,
    action: string,
    performedBy: number,
    details?: Record<string, unknown>
  ): void {
    try {
      const stmt = this.prepareStatement<
        [string, number, string, number, string | null],
        void
      >(
        `INSERT INTO activity_logs (
          entity_type, entity_id, action, performed_by, details
        ) VALUES (?, ?, ?, ?, ?)`
      );

      stmt.run(
        entityType,
        entityId,
        action,
        performedBy,
        details ? JSON.stringify(details) : null
      );

      Logger.info(
        `Activity logged: [${entityType}] ID: ${entityId} Action: ${action} by User: ${performedBy}`
      );
    } catch (error) {
      Logger.error(
        `Failed to log activity for ${entityType} (ID: ${entityId}):`,
        error
      );
      // Don't throw here as logging failure shouldn't break the main operation
    }
  }

  /**
   * Executes a set of database operations within a transaction.
   */
  protected transaction<T>(callback: () => T): T {
    try {
      const tx = this.db.transaction(callback);
      return tx();
    } catch (error) {
      Logger.error(`Transaction failed:`, error);
      throw new Error(
        `Transaction failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Prepares an SQL statement for execution.
   */
  protected prepareStatement<TParams extends unknown[], TResult>(
    sql: string
  ): Database.Statement<TParams, TResult> {
    try {
      return this.db.prepare(sql);
    } catch (error) {
      Logger.error(`Failed to prepare statement: "${sql}":`, error);
      throw new Error(
        `Failed to prepare statement: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Checks if the database connection is valid.
   */
  protected checkConnection(): void {
    try {
      // Simple query to check connection
      this.db.prepare("SELECT 1").get();
    } catch (error) {
      Logger.error("Database connection check failed:", error);
      throw new Error("Database connection is not valid");
    }
  }

  /**
   * Safely closes the database connection.
   */
  public close(): void {
    try {
      if (this.db) {
        this.db.close();
      }
    } catch (error) {
      Logger.error("Error closing database:", error);
      throw new Error(
        `Failed to close database: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}
