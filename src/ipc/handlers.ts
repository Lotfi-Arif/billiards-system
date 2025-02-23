import { PoolTableService } from "@/backend/PoolTableService";
import { ApiResponse } from "@/shared/types/electronAPI";
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
  // Table operations
  createHandler(IpcChannels.TABLE_GET_ALL, async () => {
    return tableService.getAllTables();
  });

  createHandler(IpcChannels.TABLE_GET_STATUS, async ({ tableId }) => {
    return tableService.getTableStatus(tableId);
  });

  createHandler(IpcChannels.TABLE_CREATE, async ({ number }) => {
    return tableService.createTable({ number });
  });

  createHandler(
    IpcChannels.TABLE_OPEN,
    async ({ tableId, userId, sessionType, duration }) => {
      return tableService.openTable(tableId, userId, sessionType, duration);
    }
  );

  createHandler(IpcChannels.TABLE_CLOSE, async ({ tableId, userId }) => {
    return tableService.closeTable(tableId, userId);
  });

  createHandler(IpcChannels.TABLE_UPDATE, async ({ tableId, userId, data }) => {
    return tableService.updateTable(tableId, userId, data);
  });

  createHandler(IpcChannels.TABLE_MAINTENANCE, async ({ tableId, userId }) => {
    return tableService.setTableMaintenance(tableId, userId);
  });

  createHandler(
    IpcChannels.TABLE_RESERVE,
    async ({ tableId, userId, duration }) => {
      return tableService.reserveTable(tableId, userId, duration);
    }
  );

  // Session operations
  createHandler(IpcChannels.SESSION_GET_ACTIVE, async () => {
    return tableService.getActiveSessions();
  });

  createHandler(IpcChannels.SESSION_GET_BY_TABLE, async ({ tableId }) => {
    return tableService.getTableSessions(tableId);
  });
}
