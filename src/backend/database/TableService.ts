import { Database } from "better-sqlite3";
import {
  Table,
  TableStatus,
  CreateTableDTO,
  UpdateTableDTO,
  TableSession,
} from "../../shared/types/Table";
import { DatabaseError, NotFoundError, PermissionError } from "../../shared/types/errors";
import { BaseService } from "./BaseService";
import Logger from "../../shared/logger";

export class TableService extends BaseService {
  private static readonly INITIAL_TABLES: CreateTableDTO[] = [
    { tableNumber: 1, hourlyRate: 5.0, condition: "Excellent" },
    { tableNumber: 2, hourlyRate: 5.0, condition: "Good" },
    { tableNumber: 3, hourlyRate: 6.0, condition: "Excellent" },
    { tableNumber: 4, hourlyRate: 6.0, condition: "Good" },
  ];

  constructor(db: Database) {
    super(db);
    Logger.info("Initializing TableService");
    this.initializeTableSchema();
    this.initializeSessionSchema();
    this.initializeDefaultTables();
  }

  private async initializeDefaultTables(): Promise<void> {
    try {
      const tables = await this.getAllTables();
      if (tables.length === 0) {
        Logger.info("No tables found, initializing default tables");
        for (const table of TableService.INITIAL_TABLES) {
          await this.createTable(table);
        }
        Logger.info("Default tables initialized successfully");
      }
    } catch (error) {
      Logger.error("Failed to initialize default tables", error);
      throw new DatabaseError("Failed to initialize default tables", { error });
    }
  }

  private initializeTableSchema(): void {
    try {
      Logger.info("Initializing table schema");
      const sql = `
        CREATE TABLE IF NOT EXISTS tables (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tableNumber INTEGER UNIQUE NOT NULL,
          status TEXT NOT NULL DEFAULT '${TableStatus.OFF}',
          lastMaintenance DATETIME,
          condition TEXT,
          hourlyRate DECIMAL(10,2) NOT NULL,
          isActive BOOLEAN NOT NULL DEFAULT 1,
          lightState BOOLEAN NOT NULL DEFAULT 0,
          prayerCooldownEnd DATETIME,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `;
      this.db.exec(sql);
      Logger.info("Table schema initialized successfully");
    } catch (error) {
      Logger.error("Failed to initialize table schema", error);
      throw new DatabaseError("Failed to initialize table schema", { error });
    }
  }

  private initializeSessionSchema(): void {
    try {
      const sql = `
        CREATE TABLE IF NOT EXISTS table_sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tableId INTEGER NOT NULL,
          startTime DATETIME NOT NULL,
          endTime DATETIME,
          staffId INTEGER NOT NULL,
          customerId INTEGER,
          totalAmount DECIMAL(10,2),
          status TEXT NOT NULL DEFAULT 'ACTIVE',
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (tableId) REFERENCES tables(id),
          FOREIGN KEY (staffId) REFERENCES users(id),
          FOREIGN KEY (customerId) REFERENCES users(id)
        )
      `;
      this.db.exec(sql);
    } catch (error) {
      throw new DatabaseError("Failed to initialize session schema", { error });
    }
  }

  async getSessionById(id: number): Promise<TableSession> {
    try {
      Logger.info(`Fetching session ${id}`);
      const sql = "SELECT * FROM table_sessions WHERE id = ? AND isActive = 1";
      const stmt = this.db.prepare(sql);
      const session = stmt.get(id) as any;

      if (!session) {
        throw new NotFoundError(`Session ${id} not found`);
      }

      return {
        id: session.id,
        tableId: session.tableId,
        startTime: new Date(session.startTime),
        endTime: session.endTime ? new Date(session.endTime) : null,
        staffId: session.staffId,
        customerId: session.customerId,
        totalAmount: session.totalAmount,
        status: session.status,
      };
    } catch (error) {
      Logger.error(`Failed to fetch session ${id}`, error);
      if (error instanceof NotFoundError) throw error;
      throw new DatabaseError(`Failed to fetch session ${id}`, { error });
    }
  }

  async startSession(
    tableId: number,
    staffId: number,
    customerId?: number
  ): Promise<TableSession> {
    try {
      // Check if staff is allowed to start session
      const table = await this.getTableById(tableId);

      if (table.status === TableStatus.PRAYER_COOLDOWN) {
        throw new PermissionError("Cannot start session during prayer time");
      }

      if (table.status !== TableStatus.AVAILABLE) {
        throw new DatabaseError("Table is not available");
      }

      const sql = `
        INSERT INTO table_sessions (tableId, staffId, customerId, startTime, status)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP, 'ACTIVE')
      `;

      const stmt = this.db.prepare(sql);
      const result = this.transaction(() => {
        const sessionResult = stmt.run(tableId, staffId, customerId);

        // Update table status
        const updateStmt = this.db.prepare(`
          UPDATE tables 
          SET status = ?, lightState = 1, updatedAt = CURRENT_TIMESTAMP
          WHERE id = ?
        `);
        updateStmt.run(TableStatus.IN_USE, tableId);

        return sessionResult;
      });

      return this.getSessionById(Number(result.lastInsertRowid));
    } catch (error) {
      Logger.error(`Failed to start session for table ${tableId}`, error);
      throw error;
    }
  }

  async endSession(sessionId: number, staffId: number): Promise<TableSession> {
    try {
      const session = await this.getSessionById(sessionId);

      if (session.status !== "ACTIVE") {
        throw new DatabaseError("Session is not active");
      }

      const duration = new Date().getTime() - session.startTime.getTime();
      const hours = duration / (1000 * 60 * 60);
      const table = await this.getTableById(session.tableId);
      const totalAmount = Math.ceil(hours * table.hourlyRate);

      const sql = `
        UPDATE table_sessions 
        SET endTime = CURRENT_TIMESTAMP, 
            totalAmount = ?,
            status = 'COMPLETED',
            updatedAt = CURRENT_TIMESTAMP
        WHERE id = ?
      `;

      const stmt = this.db.prepare(sql);
      this.transaction(() => {
        stmt.run(totalAmount, sessionId);

        // Update table status
        const updateStmt = this.db.prepare(`
          UPDATE tables 
          SET status = ?, lightState = 0, updatedAt = CURRENT_TIMESTAMP
          WHERE id = ?
        `);
        updateStmt.run(TableStatus.AVAILABLE, session.tableId);
      });

      return this.getSessionById(sessionId);
    } catch (error) {
      Logger.error(`Failed to end session ${sessionId}`, error);
      throw error;
    }
  }

  async setPrayerCooldown(duration: number): Promise<void> {
    try {
      const cooldownEnd = new Date(Date.now() + duration * 60000); // Convert minutes to milliseconds

      const sql = `
        UPDATE tables 
        SET status = ?, 
            lightState = 0,
            prayerCooldownEnd = ?,
            updatedAt = CURRENT_TIMESTAMP
        WHERE status = ?
      `;

      const stmt = this.db.prepare(sql);
      stmt.run(
        TableStatus.PRAYER_COOLDOWN,
        cooldownEnd.toISOString(),
        TableStatus.IN_USE
      );

      Logger.info(`Prayer cooldown set for ${duration} minutes`);
    } catch (error) {
      Logger.error("Failed to set prayer cooldown", error);
      throw new DatabaseError("Failed to set prayer cooldown", { error });
    }
  }

  async checkPrayerCooldown(): Promise<boolean> {
    try {
      const sql = `
        SELECT COUNT(*) as count 
        FROM tables 
        WHERE status = ? 
        AND prayerCooldownEnd > CURRENT_TIMESTAMP
      `;

      const stmt = this.db.prepare(sql);
      const result = stmt.get(TableStatus.PRAYER_COOLDOWN) as { count: number };

      return result.count > 0;
    } catch (error) {
      Logger.error("Failed to check prayer cooldown", error);
      throw new DatabaseError("Failed to check prayer cooldown", { error });
    }
  }

  async createTable(data: CreateTableDTO): Promise<Table> {
    try {
      Logger.info(`Creating new table with number: ${data.tableNumber}`);
      const sql = `
        INSERT INTO tables (tableNumber, hourlyRate, condition, status)
        VALUES (?, ?, ?, ?)
      `;

      const stmt = this.db.prepare(sql);
      const result = this.transaction(() => {
        return stmt.run(
          data.tableNumber,
          data.hourlyRate,
          data.condition || "Good",
          TableStatus.OFF
        );
      });

      if (!result.lastInsertRowid) {
        throw new DatabaseError("Failed to create table - no ID returned");
      }

      return this.getTableById(Number(result.lastInsertRowid));
    } catch (error) {
      Logger.error(`Failed to create table`, error);
      throw new DatabaseError("Failed to create table", { error });
    }
  }

  async getAllTables(): Promise<Table[]> {
    try {
      Logger.info("Fetching all active tables");
      const sql = "SELECT * FROM tables WHERE isActive = 1";
      const stmt = this.db.prepare(sql);
      const tables = stmt.all() as any[];

      return tables.map((table) => ({
        id: table.id,
        tableNumber: table.tableNumber,
        status: table.status as TableStatus,
        lastMaintenance: table.lastMaintenance
          ? new Date(table.lastMaintenance)
          : null,
        condition: table.condition,
        hourlyRate: table.hourlyRate,
        isActive: Boolean(table.isActive),
        lightState: Boolean(table.lightState),
        prayerCooldownEnd: table.prayerCooldownEnd
          ? new Date(table.prayerCooldownEnd)
          : null,
        createdAt: new Date(table.createdAt),
        updatedAt: new Date(table.updatedAt),
      }));
    } catch (error) {
      Logger.error("Failed to fetch tables", error);
      throw new DatabaseError("Failed to fetch tables", { error });
    }
  }

  async getTableById(id: number): Promise<Table> {
    try {
      Logger.info(`Fetching table ${id}`);
      const sql = "SELECT * FROM tables WHERE id = ? AND isActive = 1";
      const stmt = this.db.prepare(sql);
      const table = stmt.get(id) as any;

      if (!table) {
        throw new NotFoundError(`Table ${id} not found`);
      }

      return {
        id: table.id,
        tableNumber: table.tableNumber,
        status: table.status as TableStatus,
        lastMaintenance: table.lastMaintenance
          ? new Date(table.lastMaintenance)
          : null,
        condition: table.condition,
        currentSession: table.currentSession
          ? {
              startTime: new Date(table.currentSession.startTime),
              openedBy: table.currentSession.openedBy,
              customerId: table.currentSession.customerId,
            }
          : null,
        lightState: Boolean(table.lightState),
        prayerCooldownEnd: table.prayerCooldownEnd
          ? new Date(table.prayerCooldownEnd)
          : null,
        hourlyRate: table.hourlyRate,
        isActive: Boolean(table.isActive),
        createdAt: new Date(table.createdAt),
        updatedAt: new Date(table.updatedAt),
      };
    } catch (error) {
      Logger.error(`Failed to fetch table ${id}`, error);
      if (error instanceof NotFoundError) throw error;
      throw new DatabaseError(`Failed to fetch table ${id}`, { error });
    }
  }

  async updateTableStatus(
    id: number,
    data: UpdateTableDTO,
    performedBy?: number
  ): Promise<Table> {
    try {
      Logger.info(`Updating table ${id} status`);
      const table = await this.getTableById(id);

      const updates: string[] = [];
      const values: any[] = [];

      if (data.status !== undefined) {
        updates.push("status = ?");
        values.push(data.status);
      }
      if (data.condition !== undefined) {
        updates.push("condition = ?");
        values.push(data.condition);
      }
      if (data.hourlyRate !== undefined) {
        updates.push("hourlyRate = ?");
        values.push(data.hourlyRate);
      }
      if (data.lastMaintenance !== undefined) {
        updates.push("lastMaintenance = ?");
        values.push(data.lastMaintenance.toISOString());
      }
      if (data.isActive !== undefined) {
        updates.push("isActive = ?");
        values.push(data.isActive ? 1 : 0);
      }

      updates.push("updatedAt = CURRENT_TIMESTAMP");

      const sql = `
        UPDATE tables 
        SET ${updates.join(", ")}
        WHERE id = ? AND isActive = 1
      `;

      const stmt = this.db.prepare(sql);
      const result = this.transaction(() => {
        return stmt.run(...values, id);
      });

      if (result.changes === 0) {
        throw new NotFoundError(`Table ${id} not found or no changes made`);
      }

      if (performedBy) {
        this.logActivity("Table", id, "UPDATE_STATUS", performedBy, {
          previousStatus: table.status,
          newStatus: data.status,
          ...data,
        });
      }

      return this.getTableById(id);
    } catch (error) {
      Logger.error(`Failed to update table ${id}`, error);
      if (error instanceof NotFoundError) throw error;
      throw new DatabaseError(`Failed to update table ${id}`, { error });
    }
  }

  async isTableAvailable(id: number): Promise<boolean> {
    try {
      Logger.info(`Checking availability for table ${id}`);
      const table = await this.getTableById(id);
      const available = table.status === TableStatus.AVAILABLE;
      Logger.info(
        `Table ${id} is ${available ? "available" : "not available"}`
      );
      return available;
    } catch (error) {
      Logger.error(`Failed to check table ${id} availability`, error);
      if (error instanceof NotFoundError) throw error;
      throw new DatabaseError("Failed to check table availability", { error });
    }
  }

  async deleteTable(id: number): Promise<void> {
    try {
      Logger.info(`Deleting (deactivating) table ${id}`);
      const table = await this.getTableById(id);

      if (!table.isActive) {
        throw new NotFoundError(`Table ${id} is already deleted`);
      }

      const sql = `
        UPDATE tables 
        SET isActive = 0, updatedAt = CURRENT_TIMESTAMP
        WHERE id = ? AND isActive = 1
      `;

      const stmt = this.db.prepare(sql);
      const result = this.transaction(() => {
        return stmt.run(id);
      });

      if (result.changes === 0) {
        throw new NotFoundError(`Table ${id} not found or already deleted`);
      }

      Logger.info(`Table ${id} deactivated successfully`);
    } catch (error) {
      Logger.error(`Failed to delete table ${id}`, error);
      if (error instanceof NotFoundError) throw error;
      throw new DatabaseError("Failed to delete table", { error });
    }
  }
}
