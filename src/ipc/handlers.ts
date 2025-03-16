import { PoolTableService } from "@/backend/PoolTableService";
import { UserService } from "@backend/UserService";
import { ApiResponse } from "@/shared/types/electronAPI";
import { IpcChannels, TableOperations } from "@/shared/types/ipc";
import { ipcMain } from "electron";

// Type-safe handler function with improved error handling
function createHandler<K extends IpcChannels>(
  channel: K,
  handler: (
    args: TableOperations[K]["request"],
  ) => Promise<TableOperations[K]["response"]>,
  errorMessage: string = "Operation failed",
) {
  return ipcMain.handle(
    channel,
    async (
      _,
      args: TableOperations[K]["request"],
    ): Promise<ApiResponse<TableOperations[K]["response"]>> => {
      try {
        const result = await handler(args);
        return {
          success: true,
          data: result,
        };
      } catch (error) {
        console.error(`Error in ${channel}:`, error);
        return {
          success: false,
          error: error instanceof Error ? error.message : errorMessage,
        };
      }
    },
  );
}

export function setupTableHandlers(tableService: PoolTableService) {
  // Table query operations
  createHandler(
    IpcChannels.TABLE_GET_ALL,
    async () => {
      const tables = await tableService.getAllTables();
      if (!tables) throw new Error("Failed to fetch tables");
      return tables;
    },
    "Failed to fetch tables",
  );

  createHandler(
    IpcChannels.TABLE_GET_STATUS,
    async ({ tableId }) => {
      const table = await tableService.getTableStatus(tableId);
      if (!table) throw new Error("Table not found");
      return table;
    },
    "Failed to fetch table status",
  );

  // Table management operations
  createHandler(
    IpcChannels.TABLE_CREATE,
    async ({ number }) => {
      const table = await tableService.createTable({ number });
      if (!table) throw new Error("Failed to create table");
      return table;
    },
    "Failed to create table",
  );

  createHandler(
    IpcChannels.TABLE_OPEN,
    async ({ tableId, userId, sessionType, duration }) => {
      const table = await tableService.openTable(
        tableId,
        userId,
        sessionType,
        duration,
      );
      if (!table) throw new Error("Failed to open table");
      return table;
    },
    "Failed to open table",
  );

  createHandler(
    IpcChannels.TABLE_CLOSE,
    async ({ tableId, userId }) => {
      const table = await tableService.closeTable(tableId, userId);
      if (!table) throw new Error("Failed to close table");
      return table;
    },
    "Failed to close table",
  );

  createHandler(
    IpcChannels.TABLE_UPDATE,
    async ({ tableId, userId, data }) => {
      const table = await tableService.updateTable(tableId, userId, data);
      if (!table) throw new Error("Failed to update table");
      return table;
    },
    "Failed to update table",
  );

  createHandler(
    IpcChannels.TABLE_MAINTENANCE,
    async ({ tableId, userId }) => {
      const table = await tableService.setTableMaintenance(tableId, userId);
      if (!table) throw new Error("Failed to set table maintenance");
      return table;
    },
    "Failed to set table maintenance",
  );

  // Session operations
  createHandler(
    IpcChannels.SESSION_GET_ACTIVE,
    async () => {
      const sessions = await tableService.getActiveSessions();
      if (!sessions) throw new Error("Failed to fetch active sessions");
      return sessions;
    },
    "Failed to fetch active sessions",
  );

  createHandler(
    IpcChannels.SESSION_GET_BY_TABLE,
    async ({ tableId }) => {
      const sessions = await tableService.getTableSessions(tableId);
      if (!sessions) throw new Error("Failed to fetch table sessions");
      return sessions;
    },
    "Failed to fetch table sessions",
  );
}

// Update the auth handlers to match UserService implementation
export function setupAuthHandlers(userService: UserService) {
  createHandler(
    IpcChannels.AUTH_LOGIN,
    async ({ email, password }) => {
      const result = await userService.login({ email, password });
      if (!result) throw new Error("Login failed");
      return result;
    },
    "Failed to login",
  );

  createHandler(
    IpcChannels.AUTH_LOGOUT,
    async ({ userId }) => {
      if (!userId) throw new Error("User ID is required");
      await userService.logout(userId);
    },
    "Failed to logout",
  );

  createHandler(
    IpcChannels.AUTH_GET_CURRENT_USER,
    async ({ userId }) => {
      if (!userId) throw new Error("User ID is required");
      const user = await userService.getCurrentUser(userId);
      if (!user) throw new Error("User not found");
      return user;
    },
    "Failed to get current user",
  );
}

// Error handler to catch any uncaught errors in IPC communication
ipcMain.on("error", (event, error) => {
  console.error("IPC error:", error);
});

// Cleanup function
export function cleanupHandlers() {
  Object.values(IpcChannels).forEach((channel) => {
    ipcMain.removeHandler(channel);
  });
  console.log("IPC handlers cleaned up");
}
