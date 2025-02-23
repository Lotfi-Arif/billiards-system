import React, { createContext, useContext, useEffect } from "react";
import { TableStatus, SessionType } from "@prisma/client";
import { useTableStore } from "../stores/tableStore";
import { TableWithSessions } from "@shared/types/Table";
import { useWebSocket } from "@renderer/hooks/useWebSocket";

interface TableContextValue {
  tables: TableWithSessions[];
  isLoading: boolean;
  error: Error | null;
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
  refreshTables: () => Promise<void>;
}

const TableContext = createContext<TableContextValue | null>(null);

export const useTable = () => {
  const context = useContext(TableContext);
  if (!context) {
    throw new Error("useTable must be used within a TableProvider");
  }
  return context;
};

export const TableProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const {
    tables,
    isLoading,
    error,
    fetchTables,
    openTable,
    closeTable,
    setTableMaintenance,
    updateTableStatus,
  } = useTableStore();

  // Set up WebSocket listeners for real-time updates
  useWebSocket((message) => {
    if (
      message.event === "TABLE_UPDATED" ||
      message.event === "SESSION_UPDATED" ||
      message.event === "RESERVATION_UPDATED"
    ) {
      fetchTables();
    }
  });

  // Initial fetch
  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  const value: TableContextValue = {
    tables,
    isLoading,
    error,
    openTable,
    closeTable,
    setTableMaintenance,
    updateTableStatus,
    refreshTables: fetchTables,
  };

  return (
    <TableContext.Provider value={value}>{children}</TableContext.Provider>
  );
};
