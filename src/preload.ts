import { ApiResponse, ElectronAPI } from "@/shared/types/electronAPI";
import { IpcChannels, TableOperations } from "@/shared/types/ipc";
import { contextBridge, ipcRenderer } from "electron";

// Type-safe invoke function
function createInvoke<K extends IpcChannels>(
  channel: K
): (
  args: TableOperations[K]["request"]
) => Promise<ApiResponse<TableOperations[K]["response"]>> {
  return (args) => ipcRenderer.invoke(channel, args);
}

// Create the API object that will be exposed to the renderer
const api: ElectronAPI = {
  login: (credentials) => createInvoke(IpcChannels.AUTH_LOGIN)(credentials),

  logout: () => createInvoke(IpcChannels.AUTH_LOGOUT)(),

  getCurrentUser: () => createInvoke(IpcChannels.AUTH_GET_CURRENT_USER)(),
  
  getTables: () => createInvoke(IpcChannels.TABLE_GET_ALL)(),

  getTableStatus: (tableId) =>
    createInvoke(IpcChannels.TABLE_GET_STATUS)({ tableId }),

  createTable: (number) => createInvoke(IpcChannels.TABLE_CREATE)({ number }),

  openTable: (tableId, userId, sessionType, duration) =>
    createInvoke(IpcChannels.TABLE_OPEN)({
      tableId,
      userId,
      sessionType,
      duration,
    }),

  closeTable: (tableId, userId) =>
    createInvoke(IpcChannels.TABLE_CLOSE)({ tableId, userId }),

  updateTable: (tableId, userId, data) =>
    createInvoke(IpcChannels.TABLE_UPDATE)({ tableId, userId, data }),

  setTableMaintenance: (tableId, userId) =>
    createInvoke(IpcChannels.TABLE_MAINTENANCE)({ tableId, userId }),
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld("electron", api);
