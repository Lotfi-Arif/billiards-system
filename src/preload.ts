import { contextBridge, ipcRenderer, Session } from "electron";
import {
  ApiResponse,
  ElectronAPI,
  SessionData,
} from "@/shared/types/electronAPI";
import { IpcChannels, TableOperations } from "@/shared/types/ipc";
import { TableWithSessions } from "./shared/types/Table";
import { SessionType, TableStatus } from "@prisma/client";

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
  // Auth operations
  login: (credentials) => createInvoke(IpcChannels.AUTH_LOGIN)(credentials),
  logout: (userId) => createInvoke(IpcChannels.AUTH_LOGOUT)({ userId }),
  getCurrentUser: (userId) =>
    createInvoke(IpcChannels.AUTH_GET_CURRENT_USER)({ userId }),

  // Table operations
  // Table operations
  getTables: () => ipcRenderer.invoke(IpcChannels.TABLE_GET_ALL),

  getTableStatus: (tableId: string) =>
    ipcRenderer.invoke(IpcChannels.TABLE_GET_STATUS, { tableId }),

  createTable: (number: number) =>
    ipcRenderer.invoke(IpcChannels.TABLE_CREATE, { number }),

  openTable: (
    tableId: string,
    userId: string,
    sessionType: SessionType,
    duration?: number
  ) =>
    ipcRenderer.invoke(IpcChannels.TABLE_OPEN, {
      tableId,
      userId,
      sessionType,
      duration,
    }),

  closeTable: (tableId: string, userId: string) =>
    ipcRenderer.invoke(IpcChannels.TABLE_CLOSE, { tableId, userId }),

  updateTable: (
    tableId: string,
    userId: string,
    data: { status?: TableStatus; isLightOn?: boolean }
  ) => ipcRenderer.invoke(IpcChannels.TABLE_UPDATE, { tableId, userId, data }),

  toggleMaintenance: (tableId: string, userId: string) =>
    ipcRenderer.invoke(IpcChannels.TABLE_MAINTENANCE, { tableId, userId }),

  reserveTable: (tableId: string, userId: string, duration: number) =>
    ipcRenderer.invoke(IpcChannels.TABLE_RESERVE, {
      tableId,
      userId,
      duration,
    }),

  // Session operations
  getActiveSessions: () => ipcRenderer.invoke(IpcChannels.SESSION_GET_ACTIVE),

  getTableSessions: (tableId: string) =>
    ipcRenderer.invoke(IpcChannels.SESSION_GET_BY_TABLE, { tableId }),

  // WebSocket events
  onTableUpdate: (callback: (data: TableWithSessions) => void) => {
    const channel = "table-update";
    ipcRenderer.on(channel, (_, data: TableWithSessions) => callback(data));
    return () => {
      ipcRenderer.removeAllListeners(channel);
    };
  },

  onSessionUpdate: (callback: (data: SessionData) => void) => {
    const channel = "session-update";
    ipcRenderer.on(channel, (_, data: SessionData) => callback(data));
    return () => {
      ipcRenderer.removeAllListeners(channel);
    };
  },
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld("electron", api);
