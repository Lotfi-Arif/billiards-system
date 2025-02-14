import { ipcMain } from "electron";
import Database from "better-sqlite3";
import { TableService } from "../backend/database/TableService";
import { TableStatus } from "../shared/types/Table";
import Logger from "../shared/logger";

export function initializeIpcHandlers(
  database: Database.Database,
  tableService: TableService
) {
  if (!tableService) {
    throw new Error("TableService not initialized");
  }

  ipcMain.handle("get-tables", async () => {
    try {
      Logger.info("IPC: get-tables called");
      const tables = await tableService.getAllTables();
      return { success: true, data: tables };
    } catch (error) {
      Logger.error("IPC get-tables error:", error);
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle(
    "open-table",
    async (event, id: number, performedBy?: number) => {
      try {
        Logger.info(`IPC: open-table called for table ${id}`);
        const table = await tableService.updateTableStatus(
          id,
          { status: TableStatus.IN_USE },
          performedBy
        );
        return { success: true, data: table };
      } catch (error) {
        Logger.error(`IPC open-table error:`, error);
        return { success: false, error: String(error) };
      }
    }
  );

  ipcMain.handle(
    "close-table",
    async (event, id: number, performedBy?: number) => {
      try {
        Logger.info(`IPC: close-table called for table ${id}`);
        const table = await tableService.updateTableStatus(
          id,
          { status: TableStatus.AVAILABLE },
          performedBy
        );
        return { success: true, data: table };
      } catch (error) {
        Logger.error(`IPC close-table error:`, error);
        return { success: false, error: String(error) };
      }
    }
  );

  ipcMain.handle(
    "update-table-status",
    async (event, id: number, data: any, performedBy?: number) => {
      try {
        Logger.info(`IPC: update-table-status called for table ${id}`);
        const table = await tableService.updateTableStatus(
          id,
          data,
          performedBy
        );
        return { success: true, data: table };
      } catch (error) {
        Logger.error(`IPC update-table-status error:`, error);
        return { success: false, error: String(error) };
      }
    }
  );

  Logger.info("IPC handlers initialized successfully");
}
