import React, { createContext, useContext, useState, useEffect } from "react";
import { Table, TableStatus } from "../../shared/types/Table";
import { ApiResponse } from "../../shared/types/api";

interface TableContextType {
  tables: ApiResponse<Table[]>;
  loading: boolean;
  error: string | null;
  refreshTables: () => Promise<void>;
  updateTableStatus: (
    id: number,
    status: TableStatus,
    performedBy?: number
  ) => Promise<void>;
  openTable: (id: number, performedBy?: number) => Promise<void>;
  closeTable: (id: number, performedBy?: number) => Promise<void>;
  setTableMaintenance: (id: number, performedBy?: number) => Promise<void>;
  setTableCooldown: (id: number, performedBy?: number) => Promise<void>;
}

const TableContext = createContext<TableContextType | undefined>(undefined);

export const TableProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [tables, setTables] = useState<ApiResponse<Table[]>>({
    success: false,
    data: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshTables = async () => {
    try {
      setLoading(true);
      const response = await window.electron.getTables();
      setTables(response);
      setError(null);
    } catch (err) {
      setError("Failed to load tables");
      console.error("Error loading tables:", err);
    } finally {
      setLoading(false);
    }
  };

  const updateTableStatus = async (
    id: number,
    status: TableStatus,
    performedBy?: number
  ) => {
    try {
      await window.electron.updateTableStatus(id, { status }, performedBy);
      await refreshTables();
    } catch (err) {
      setError("Failed to update table status");
      console.error("Error updating table:", err);
    }
  };

  const openTable = async (id: number, performedBy?: number) => {
    try {
      await window.electron.openTable(id, performedBy);
      await refreshTables();
    } catch (err) {
      setError("Failed to open table");
      console.error("Error opening table:", err);
    }
  };

  const closeTable = async (id: number, performedBy?: number) => {
    try {
      await window.electron.closeTable(id, performedBy);
      await refreshTables();
    } catch (err) {
      setError("Failed to close table");
      console.error("Error closing table:", err);
    }
  };

  const setTableMaintenance = async (id: number, performedBy?: number) => {
    try {
      await window.electron.setTableMaintenance(id, performedBy);
      await refreshTables();
    } catch (err) {
      setError("Failed to set table maintenance");
      console.error("Error setting maintenance:", err);
    }
  };

  const setTableCooldown = async (id: number, performedBy?: number) => {
    try {
      await window.electron.setTableCooldown(id, performedBy);
      await refreshTables();
    } catch (err) {
      setError("Failed to set table cooldown");
      console.error("Error setting cooldown:", err);
    }
  };

  useEffect(() => {
    refreshTables();
  }, []);

  return (
    <TableContext.Provider
      value={{
        tables,
        loading,
        error,
        refreshTables,
        updateTableStatus,
        openTable,
        closeTable,
        setTableMaintenance,
        setTableCooldown,
      }}
    >
      {children}
    </TableContext.Provider>
  );
};

export const useTables = () => {
  const context = useContext(TableContext);
  if (context === undefined) {
    throw new Error("useTables must be used within a TableProvider");
  }
  return context;
};
