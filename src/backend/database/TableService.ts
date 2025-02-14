import { Database } from "better-sqlite3";
import {
  Table,
  TableStatus,
  CreateTableDTO,
  UpdateTableDTO,
} from "../../shared/types/Table";
import { DatabaseError, NotFoundError } from "../../shared/types/errors";
import { BaseService } from "./BaseService";
import Logger from "../../shared/logger";

export class TableService extends BaseService {
  private static readonly INITIAL_TABLES: CreateTableDTO[] = [
    { tableNumber: 1, hourlyRate: 25.0, condition: "Excellent" },
    { tableNumber: 2, hourlyRate: 25.0, condition: "Good" },
    { tableNumber: 3, hourlyRate: 30.0, condition: "Excellent" },
    { tableNumber: 4, hourlyRate: 30.0, condition: "Good" },
    { tableNumber: 5, hourlyRate: 35.0, condition: "Excellent" },
    { tableNumber: 6, hourlyRate: 35.0, condition: "Excellent" },
  ];

  constructor(db: Database) {
    super(db);
    Logger.info("Initializing TableService");
    this.initializeTableSchema();
    this.initializeDefaultTables();
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

  async setTableCooldown(id: number, performedBy?: number): Promise<Table> {
    try {
      const table = await this.getTableById(id);
      if (table.status === TableStatus.IN_USE) {
        return this.updateTableStatus(
          id,
          { status: TableStatus.COOLDOWN },
          performedBy
        );
      }
      return table;
    } catch (error) {
      Logger.error(`Failed to set table ${id} cooldown`, error);
      throw new DatabaseError(`Failed to set table cooldown`, { error });
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
