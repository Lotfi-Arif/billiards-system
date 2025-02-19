import { create } from "zustand";
import { TableStatus, SessionType } from "@prisma/client";
import { TableWithSessions } from "../../shared/types/Table";

interface TableState {
  tables: TableWithSessions[];
  isLoading: boolean;
  error: Error | null;

  fetchTables: () => Promise<void>;
  openTable: (
    tableId: string,
    userId: string,
    sessionType: SessionType,
    duration?: number
  ) => Promise<void>;
  closeTable: (tableId: string, userId: string) => Promise<void>;
  setTableMaintenance: (tableId: string, userId: string) => Promise<void>;
  updateTableStatus: (
    tableId: string,
    userId: string,
    status: TableStatus
  ) => Promise<void>;
}

export const useTableStore = create<TableState>((set, get) => ({
  tables: [],
  isLoading: false,
  error: null,

  fetchTables: async () => {
    try {
      set({ isLoading: true });
      const response = await window.electron.getTables();

      if (!response.success) {
        throw new Error(response.error || "Failed to fetch tables");
      }

      set({
        tables: response.data || [],
        isLoading: false,
        error: null,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err : new Error(String(err)),
        isLoading: false,
      });
    }
  },

  openTable: async (tableId, userId, sessionType, duration) => {
    try {
      set({ isLoading: true });
      const response = await window.electron.openTable(
        tableId,
        userId,
        sessionType,
        duration
      );

      if (!response.success) {
        throw new Error(response.error || "Failed to open table");
      }

      // Refresh tables after operation
      await get().fetchTables();
    } catch (err) {
      set({
        error: err instanceof Error ? err : new Error(String(err)),
        isLoading: false,
      });
    }
  },

  closeTable: async (tableId, userId) => {
    try {
      set({ isLoading: true });
      const response = await window.electron.closeTable(tableId, userId);

      if (!response.success) {
        throw new Error(response.error || "Failed to close table");
      }

      // Refresh tables after operation
      await get().fetchTables();
    } catch (err) {
      set({
        error: err instanceof Error ? err : new Error(String(err)),
        isLoading: false,
      });
    }
  },

  setTableMaintenance: async (tableId, userId) => {
    try {
      set({ isLoading: true });
      const response = await window.electron.setTableMaintenance(
        tableId,
        userId
      );

      if (!response.success) {
        throw new Error(response.error || "Failed to set table maintenance");
      }

      // Refresh tables after operation
      await get().fetchTables();
    } catch (err) {
      set({
        error: err instanceof Error ? err : new Error(String(err)),
        isLoading: false,
      });
    }
  },

  updateTableStatus: async (tableId, userId, status) => {
    try {
      set({ isLoading: true });
      const response = await window.electron.updateTable(tableId, userId, {
        status,
      });

      if (!response.success) {
        throw new Error(response.error || "Failed to update table status");
      }

      // Refresh tables after operation
      await get().fetchTables();
    } catch (err) {
      set({
        error: err instanceof Error ? err : new Error(String(err)),
        isLoading: false,
      });
    }
  },
}));
