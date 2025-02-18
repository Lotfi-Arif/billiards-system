import { PoolTableService } from "@/backend/PoolTableService";
import { ApiResponse } from "@/shared/types/api";
import { IpcChannels, TableOperations } from "@/shared/types/ipc";
import { ipcMain } from "electron";

// Type-safe handler function
function createHandler<K extends IpcChannels>(
  channel: K,
  handler: (
    args: TableOperations[K]["request"]
  ) => Promise<TableOperations[K]["response"]>
) {
  return ipcMain.handle(
    channel,
    async (
      _,
      args: TableOperations[K]["request"]
    ): Promise<ApiResponse<TableOperations[K]["response"]>> => {
      try {
        const result = await handler(args);
        return { success: true, data: result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
  );
}

export function setupTableHandlers(tableService: PoolTableService) {
  // Get all tables
  createHandler(IpcChannels.TABLE_GET_ALL, async () => {
    return tableService.getAllTables();
  });

  // Get table status
  createHandler(IpcChannels.TABLE_GET_STATUS, async ({ tableId }) => {
    return tableService.getTableStatus(tableId);
  });

  // Create table
  createHandler(IpcChannels.TABLE_CREATE, async ({ number }) => {
    return tableService.createTable({ number });
  });

  // Open table
  createHandler(
    IpcChannels.TABLE_OPEN,
    async ({ tableId, userId, sessionType, duration }) => {
      return tableService.openTable(tableId, userId, sessionType, duration);
    }
  );

  // Close table
  createHandler(IpcChannels.TABLE_CLOSE, async ({ tableId, userId }) => {
    return tableService.closeTable(tableId, userId);
  });

  // Update table
  createHandler(IpcChannels.TABLE_UPDATE, async ({ tableId, userId, data }) => {
    return tableService.updateTable(tableId, userId, data);
  });

  // Set table maintenance
  createHandler(IpcChannels.TABLE_MAINTENANCE, async ({ tableId, userId }) => {
    return tableService.setTableMaintenance(tableId, userId);
  });
}
