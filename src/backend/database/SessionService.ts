import { Database } from "better-sqlite3";
import { BaseService } from "./BaseService";
import {
  Session,
  SessionStatus,
  CreateSessionDTO,
  EndSessionDTO,
} from "@/shared/types/Session";
import {
  DatabaseError,
  NotFoundError,
  BusinessError,
} from "@/shared/types/errors";
import { TableService } from "./TableService";
import { TableStatus } from "@/shared/types/Table";
import Logger from "@/shared/logger"; // Adjust the path as necessary

/**
 * SessionService handles the lifecycle of pool table sessions, including
 * starting a new session, ending an active session, and retrieving sessions
 * by various criteria. It leverages the BaseService for common database operations.
 */
export class SessionService extends BaseService {
  private tableService: TableService;

  constructor(db: Database) {
    super(db);
    this.tableService = new TableService(db);
    Logger.info("Initializing SessionService");
    this.initializeTable();
  }

  /**
   * Initializes the sessions table if it does not already exist.
   */
  private initializeTable(): void {
    try {
      Logger.info("Initializing sessions table schema if not exists");
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tableId INTEGER NOT NULL,
          customerId INTEGER,
          startTime DATETIME NOT NULL,
          endTime DATETIME,
          duration INTEGER,
          cost DECIMAL(10,2),
          status TEXT NOT NULL DEFAULT 'ACTIVE',
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (tableId) REFERENCES tables(id)
        )
      `);
      Logger.info("Sessions table schema initialized successfully");
    } catch (error) {
      Logger.error("Failed to initialize sessions table: " + error);
      throw new DatabaseError("Failed to initialize sessions table", { error });
    }
  }

  /**
   * Starts a new session for a given table.
   *
   * @param data - Details required to create a session.
   * @returns The newly created session record.
   * @throws BusinessError if the table is not available.
   * @throws DatabaseError on failure to create the session.
   */
  async startSession(data: CreateSessionDTO): Promise<Session> {
    try {
      Logger.info(`Attempting to start session for table ${data.tableId}`);
      // Check if table exists (this call will throw NotFoundError if not found)
      const table = await this.tableService.getTableById(data.tableId);

      if (!table) {
        throw new BusinessError(
          `Table ${data.tableId} does not exist or is not available`
        );
      }

      // Check availability only if a start time isn't explicitly provided.
      const startTime = data.startTime ? new Date(data.startTime) : new Date();
      if (!data.startTime) {
        Logger.info(`Verifying availability for table ${data.tableId}`);
        if (!(await this.tableService.isTableAvailable(data.tableId))) {
          Logger.warn(`Table ${data.tableId} is not available`);
          throw new BusinessError(`Table ${data.tableId} is not available`);
        }
      }

      // Wrap operations in a transaction for atomicity.
      const session = this.transaction(() => {
        // If starting a session immediately, mark the table as in use.
        if (!data.startTime) {
          Logger.info(`Updating table ${data.tableId} status to IN_USE`);
          this.tableService.updateTableStatus(data.tableId, {
            status: TableStatus.IN_USE,
          });
        }

        // Insert the session record.
        Logger.info(`Creating session record for table ${data.tableId}`);
        const stmt = this.db.prepare(`
          INSERT INTO sessions (
            tableId, 
            customerId, 
            startTime, 
            status
          ) VALUES (?, ?, ?, ?)
        `);
        const result = stmt.run(
          data.tableId,
          data.customerId || null,
          startTime.toISOString(),
          SessionStatus.ACTIVE
        );

        if (!result.lastInsertRowid) {
          Logger.error("Session creation failed: No lastInsertRowid returned");
          throw new DatabaseError("Failed to create session");
        }

        Logger.info(`Session created with id ${result.lastInsertRowid}`);
        return this.getSessionById(Number(result.lastInsertRowid));
      });

      return session;
    } catch (error) {
      Logger.error(
        `Error starting session for table ${data.tableId}: ${error}`
      );
      if (error instanceof NotFoundError || error instanceof BusinessError) {
        throw error;
      }
      throw new DatabaseError("Failed to start session", { error });
    }
  }

  /**
   * Ends an active session by updating its endTime, duration, cost, and status.
   *
   * @param id - The unique identifier of the session.
   * @param data - Optional details to update (endTime or custom status).
   * @returns The updated session record.
   * @throws BusinessError if the session is not active.
   * @throws DatabaseError on failure to update the session.
   */
  async endSession(id: number, data: EndSessionDTO = {}): Promise<Session> {
    try {
      Logger.info(`Attempting to end session with id ${id}`);
      const session = await this.getSessionById(id);

      if (session.status !== SessionStatus.ACTIVE) {
        Logger.warn(`Session ${id} is not active`);
        throw new BusinessError(`Session ${id} is not active`);
      }

      const endTime = data.endTime ? new Date(data.endTime) : new Date();
      const duration = Math.ceil(
        (endTime.getTime() - session.startTime.getTime()) / (1000 * 60)
      );
      Logger.info(`Calculated session duration for ${id}: ${duration} minutes`);

      // Retrieve table details to compute cost.
      const table = await this.tableService.getTableById(session.tableId);
      const cost = parseFloat(((duration / 60) * table.hourlyRate).toFixed(2));
      Logger.info(`Calculated session cost for ${id}: ${cost}`);

      // Execute table status update and session update within a transaction.
      const updatedSession = this.transaction(() => {
        Logger.info(`Updating table ${session.tableId} status to AVAILABLE`);
        this.tableService.updateTableStatus(session.tableId, {
          status: TableStatus.AVAILABLE,
        });

        Logger.info(
          `Updating session ${id} with endTime, duration, cost, and status`
        );
        const stmt = this.db.prepare(`
          UPDATE sessions 
          SET endTime = ?,
              duration = ?,
              cost = ?,
              status = ?,
              updatedAt = CURRENT_TIMESTAMP
          WHERE id = ? AND status = ?
        `);

        const result = stmt.run(
          endTime.toISOString(),
          duration,
          cost,
          data.status || SessionStatus.COMPLETED,
          id,
          SessionStatus.ACTIVE
        );

        if (result.changes === 0) {
          Logger.warn(`No updates made when ending session ${id}`);
          throw new NotFoundError(
            `Session with id ${id} not found or not active`
          );
        }

        Logger.info(`Session ${id} ended successfully`);
        return this.getSessionById(id);
      });

      return updatedSession;
    } catch (error) {
      Logger.error(`Error ending session ${id}: ${error}`);
      if (error instanceof NotFoundError || error instanceof BusinessError) {
        throw error;
      }
      throw new DatabaseError("Failed to end session", { error });
    }
  }

  /**
   * Retrieves a session by its unique identifier.
   *
   * @param id - The session's unique identifier.
   * @returns The session record.
   * @throws NotFoundError if the session is not found.
   */
  async getSessionById(id: number): Promise<Session> {
    try {
      Logger.info(`Fetching session with id ${id}`);
      const stmt = this.db.prepare("SELECT * FROM sessions WHERE id = ?");
      const session = stmt.get(id) as Session | undefined;

      if (!session) {
        Logger.warn(`Session with id ${id} not found`);
        throw new NotFoundError(`Session with id ${id} not found`);
      }

      Logger.info(`Session with id ${id} retrieved successfully`);
      return {
        ...session,
        startTime: new Date(session.startTime),
        endTime: session.endTime ? new Date(session.endTime) : null,
        createdAt: new Date(session.createdAt),
        updatedAt: new Date(session.updatedAt),
      };
    } catch (error) {
      Logger.error(`Error fetching session ${id}: ${error}`);
      if (error instanceof NotFoundError) throw error;
      throw new DatabaseError("Failed to fetch session by id", { error });
    }
  }

  /**
   * Retrieves all active sessions.
   *
   * @returns An array of active session records.
   * @throws DatabaseError on failure to retrieve sessions.
   */
  async getActiveSessions(): Promise<Session[]> {
    try {
      Logger.info("Fetching all active sessions");
      const stmt = this.db.prepare("SELECT * FROM sessions WHERE status = ?");
      const sessions = stmt.all(SessionStatus.ACTIVE) as Session[];

      Logger.info(`Retrieved ${sessions.length} active session(s)`);
      return sessions.map((session) => ({
        ...session,
        startTime: new Date(session.startTime),
        endTime: session.endTime ? new Date(session.endTime) : null,
        createdAt: new Date(session.createdAt),
        updatedAt: new Date(session.updatedAt),
      }));
    } catch (error) {
      Logger.error("Error fetching active sessions: " + error);
      throw new DatabaseError("Failed to get active sessions", { error });
    }
  }

  /**
   * Retrieves all sessions associated with a specific table.
   *
   * @param tableId - The table's unique identifier.
   * @returns An array of session records for that table.
   * @throws DatabaseError on failure to retrieve sessions.
   */
  async getTableSessions(tableId: number): Promise<Session[]> {
    try {
      Logger.info(`Fetching sessions for table ${tableId}`);
      // Verify that the table exists first.
      await this.tableService.getTableById(tableId);

      const stmt = this.db.prepare("SELECT * FROM sessions WHERE tableId = ?");
      const sessions = stmt.all(tableId) as Session[];

      Logger.info(
        `Retrieved ${sessions.length} session(s) for table ${tableId}`
      );
      return sessions.map((session) => ({
        ...session,
        startTime: new Date(session.startTime),
        endTime: session.endTime ? new Date(session.endTime) : null,
        createdAt: new Date(session.createdAt),
        updatedAt: new Date(session.updatedAt),
      }));
    } catch (error) {
      Logger.error(`Error fetching sessions for table ${tableId}: ${error}`);
      if (error instanceof NotFoundError) {
        Logger.warn(`Table ${tableId} not found; returning empty session list`);
        return [];
      }
      throw new DatabaseError("Failed to get table sessions", { error });
    }
  }

  /**
   * Retrieves all sessions for a specific customer.
   *
   * @param customerId - The customer's unique identifier.
   * @returns An array of session records for that customer.
   * @throws DatabaseError on failure to retrieve sessions.
   */
  async getCustomerSessions(customerId: number): Promise<Session[]> {
    try {
      Logger.info(`Fetching sessions for customer ${customerId}`);
      const stmt = this.db.prepare(
        "SELECT * FROM sessions WHERE customerId = ?"
      );
      const sessions = stmt.all(customerId) as Session[];

      Logger.info(
        `Retrieved ${sessions.length} session(s) for customer ${customerId}`
      );
      return sessions.map((session) => ({
        ...session,
        startTime: new Date(session.startTime),
        endTime: session.endTime ? new Date(session.endTime) : null,
        createdAt: new Date(session.createdAt),
        updatedAt: new Date(session.updatedAt),
      }));
    } catch (error) {
      Logger.error(
        `Error fetching sessions for customer ${customerId}: ${error}`
      );
      throw new DatabaseError("Failed to get customer sessions", { error });
    }
  }

  /**
   * Cancels a session by ending it with a CANCELLED status.
   *
   * @param id - The session's unique identifier.
   * @returns The updated session record.
   * @throws DatabaseError on failure to cancel the session.
   */
  async cancelSession(id: number): Promise<Session> {
    try {
      Logger.info(`Cancelling session with id ${id}`);
      return await this.endSession(id, { status: SessionStatus.CANCELLED });
    } catch (error) {
      Logger.error(`Error cancelling session ${id}: ${error}`);
      throw new DatabaseError("Failed to cancel session", { error });
    }
  }

  /**
   * Calculates the cost for a given session.
   *
   * @param session - The session record.
   * @returns The calculated cost.
   * @throws BusinessError if the session is still active.
   * @throws DatabaseError on failure to calculate cost.
   */
  async calculateSessionCost(session: Session): Promise<number> {
    try {
      Logger.info(`Calculating cost for session with id ${session.id}`);
      if (!session.endTime) {
        Logger.warn(
          `Cannot calculate cost for active session with id ${session.id}`
        );
        throw new BusinessError("Cannot calculate cost for active session");
      }

      const table = await this.tableService.getTableById(session.tableId);
      const duration =
        session.duration ||
        Math.ceil(
          (session.endTime.getTime() - session.startTime.getTime()) /
            (1000 * 60)
        );
      const cost = parseFloat(((duration / 60) * table.hourlyRate).toFixed(2));
      Logger.info(`Calculated cost for session ${session.id}: ${cost}`);
      return cost;
    } catch (error) {
      Logger.error(
        `Error calculating cost for session ${session.id}: ${error}`
      );
      throw new DatabaseError("Failed to calculate session cost", { error });
    }
  }
}
