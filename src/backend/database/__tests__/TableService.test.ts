import Database from "better-sqlite3";
import { TableService } from "../TableService";
import {
  TableStatus,
  CreateTableDTO,
  UpdateTableDTO,
} from "@/shared/types/Table";
import { DatabaseError, NotFoundError } from "@/shared/types/errors";

describe("TableService", () => {
  let tableService: TableService;
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(":memory:");
    tableService = new TableService(db);
  });

  describe("createTable", () => {
    it("should create a valid table with minimum required fields", async () => {
      const tableData: CreateTableDTO = {
        tableNumber: 1,
        hourlyRate: 20,
      };

      const table = await tableService.createTable(tableData);

      expect(table).toMatchObject({
        tableNumber: 1,
        hourlyRate: 20,
        condition: "Good", // Default value
        status: TableStatus.AVAILABLE,
        isActive: 1,
      });
      expect(table.id).toBeDefined();
      expect(table.createdAt).toBeInstanceOf(Date);
      expect(table.updatedAt).toBeInstanceOf(Date);
    });

    it("should create a table with custom condition", async () => {
      const tableData: CreateTableDTO = {
        tableNumber: 1,
        hourlyRate: 20,
        condition: "Excellent",
      };

      const table = await tableService.createTable(tableData);
      expect(table.condition).toBe("Excellent");
    });

    it("should throw error for duplicate table number", async () => {
      const tableData: CreateTableDTO = {
        tableNumber: 1,
        hourlyRate: 20,
      };

      await tableService.createTable(tableData);
      await expect(tableService.createTable(tableData)).rejects.toThrow(
        DatabaseError
      );
    });

    it("should create tables with different numbers", async () => {
      const table1 = await tableService.createTable({
        tableNumber: 1,
        hourlyRate: 20,
      });
      const table2 = await tableService.createTable({
        tableNumber: 2,
        hourlyRate: 25,
      });

      expect(table1.tableNumber).toBe(1);
      expect(table2.tableNumber).toBe(2);
    });
  });

  describe("getTableById", () => {
    let createdTable: any;

    beforeEach(async () => {
      createdTable = await tableService.createTable({
        tableNumber: 1,
        hourlyRate: 20,
      });
    });

    it("should return the correct table", async () => {
      const table = await tableService.getTableById(createdTable.id);
      expect(table).toMatchObject({
        id: createdTable.id,
        tableNumber: 1,
        hourlyRate: 20,
      });
    });

    it("should throw NotFoundError for non-existent table", async () => {
      await expect(tableService.getTableById(999)).rejects.toThrow(
        NotFoundError
      );
    });

    it("should return correct date types", async () => {
      const table = await tableService.getTableById(createdTable.id);
      expect(table.createdAt).toBeInstanceOf(Date);
      expect(table.updatedAt).toBeInstanceOf(Date);
      expect(table.lastMaintenance).toBeNull();
    });
  });

  describe("getAllTables", () => {
    beforeEach(async () => {
      await tableService.createTable({ tableNumber: 1, hourlyRate: 20 });
      await tableService.createTable({ tableNumber: 2, hourlyRate: 25 });
      await tableService.createTable({ tableNumber: 3, hourlyRate: 30 });
    });

    it("should return all active tables", async () => {
      const tables = await tableService.getAllTables();
      expect(tables).toHaveLength(3);
      expect(tables.map((t) => t.tableNumber)).toEqual([1, 2, 3]);
    });

    it("should not return inactive tables", async () => {
      await tableService.deleteTable(1); // Soft delete table 1
      const tables = await tableService.getAllTables();
      expect(tables).toHaveLength(2);
      expect(tables.map((t) => t.tableNumber)).toEqual([2, 3]);
    });

    it("should return tables with proper date formatting", async () => {
      const tables = await tableService.getAllTables();
      tables.forEach((table) => {
        expect(table.createdAt).toBeInstanceOf(Date);
        expect(table.updatedAt).toBeInstanceOf(Date);
      });
    });
  });

  describe("updateTableStatus", () => {
    let tableId: number;

    beforeEach(async () => {
      const table = await tableService.createTable({
        tableNumber: 1,
        hourlyRate: 20,
      });
      tableId = table.id;
    });

    it("should update table status", async () => {
      const updateData: UpdateTableDTO = {
        status: TableStatus.IN_USE,
      };
      const updated = await tableService.updateTableStatus(tableId, updateData);
      expect(updated.status).toBe(TableStatus.IN_USE);
    });

    it("should update multiple fields", async () => {
      const updateData: UpdateTableDTO = {
        status: TableStatus.MAINTENANCE,
        condition: "Needs repair",
        hourlyRate: 25,
      };
      const updated = await tableService.updateTableStatus(tableId, updateData);
      expect(updated).toMatchObject(updateData);
    });

    it("should update lastMaintenance date", async () => {
      const maintenanceDate = new Date();
      const updated = await tableService.updateTableStatus(tableId, {
        lastMaintenance: maintenanceDate,
      });
      expect(updated.lastMaintenance).toBeInstanceOf(Date);
      expect(updated.lastMaintenance?.getTime()).toBe(
        maintenanceDate.getTime()
      );
    });

    it("should throw error for non-existent table", async () => {
      await expect(
        tableService.updateTableStatus(999, { status: TableStatus.IN_USE })
      ).rejects.toThrow(NotFoundError);
    });

    it("should update isActive status", async () => {
      // First create a table
      const createdTable = await tableService.createTable({
        tableNumber: Math.floor(Math.random() * 1000), // Use random number to avoid conflicts
        hourlyRate: 20,
      });

      // Then update its active status
      const updated = await tableService.updateTableStatus(createdTable.id, {
        isActive: false,
      });

      // Verify the update
      expect(updated.isActive).toBe(0); // SQLite uses 0 for false

      // Verify it doesn't show up in getAllTables
      const allTables = await tableService.getAllTables();
      expect(allTables.find((t) => t.id === createdTable.id)).toBeUndefined();
    });
  });

  describe("deleteTable", () => {
    let tableId: number;

    beforeEach(async () => {
      const table = await tableService.createTable({
        tableNumber: 1,
        hourlyRate: 20,
      });
      tableId = table.id;
    });

    it("should soft delete a table", async () => {
      await tableService.deleteTable(tableId);
      const tables = await tableService.getAllTables();
      expect(tables).toHaveLength(0);
    });

    it("should throw error when deleting non-existent table", async () => {
      await expect(tableService.deleteTable(999)).rejects.toThrow(
        NotFoundError
      );
    });

    it("should not allow double deletion", async () => {
      await tableService.deleteTable(tableId);

      await expect(tableService.deleteTable(tableId)).rejects.toThrow(
        `Table with id ${tableId} has already been deleted`
      );
    });
  });

  describe("isTableAvailable", () => {
    let tableId: number;

    beforeEach(async () => {
      const table = await tableService.createTable({
        tableNumber: 1,
        hourlyRate: 20,
      });
      tableId = table.id;
    });

    it("should return true for available table", async () => {
      const isAvailable = await tableService.isTableAvailable(tableId);
      expect(isAvailable).toBe(true);
    });

    it("should return false for in-use table", async () => {
      await tableService.updateTableStatus(tableId, {
        status: TableStatus.IN_USE,
      });
      const isAvailable = await tableService.isTableAvailable(tableId);
      expect(isAvailable).toBe(false);
    });

    it("should return false for maintenance table", async () => {
      await tableService.updateTableStatus(tableId, {
        status: TableStatus.MAINTENANCE,
      });
      const isAvailable = await tableService.isTableAvailable(tableId);
      expect(isAvailable).toBe(false);
    });

    it("should return false for reserved table", async () => {
      await tableService.updateTableStatus(tableId, {
        status: TableStatus.RESERVED,
      });
      const isAvailable = await tableService.isTableAvailable(tableId);
      expect(isAvailable).toBe(false);
    });

    it("should throw error for non-existent table", async () => {
      await expect(tableService.isTableAvailable(999)).rejects.toThrow(
        NotFoundError
      );
    });
  });
});
