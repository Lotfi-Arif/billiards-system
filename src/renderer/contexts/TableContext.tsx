import React, { createContext, useContext, useEffect, useState } from "react";
import { TableWithSessions } from "@/shared/types/Table";

interface TableContextType {
  tables: TableWithSessions[];
  isLoading: boolean;
  error: Error | null;
  refreshTables: () => Promise<void>;
}

const TableContext = createContext<TableContextType | undefined>(undefined);

export const TableProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [tables, setTables] = useState<TableWithSessions[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const electron = window.electron;

  const fetchTables = async () => {
    try {
      setIsLoading(true);
      const response = await electron.getTables();
      if (response.success && response.data) {
        setTables(response.data);
      } else {
        throw new Error(response.error || "Failed to fetch tables");
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  const value = {
    tables,
    isLoading,
    error,
    refreshTables: fetchTables,
  };

  return (
    <TableContext.Provider value={value}>{children}</TableContext.Provider>
  );
};

export const useTables = () => {
  const context = useContext(TableContext);
  if (context === undefined) {
    throw new Error("useTables must be used within a TableProvider");
  }
  return context;
};
