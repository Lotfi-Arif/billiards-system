import React, { createContext, useContext, useEffect } from 'react';
import { TableStatus, SessionType } from '@prisma/client';
import { useTableStore } from '../stores/tableStore';
import { TableWithSessions } from '@shared/types/Table';

// Type for the context value
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

// Create context with initial value
const TableContext = createContext<TableContextValue>({
  tables: [],
  isLoading: false,
  error: null,
  openTable: async () => {
    throw new Error('TableProvider not found');
  },
  closeTable: async () => {
    throw new Error('TableProvider not found');
  },
  setTableMaintenance: async () => {
    throw new Error('TableProvider not found');
  },
  updateTableStatus: async () => {
    throw new Error('TableProvider not found');
  },
  refreshTables: async () => {
    throw new Error('TableProvider not found');
  },
});

// Custom hook to use the table context
export const useTable = () => {
  const context = useContext(TableContext);
  if (!context) {
    throw new Error('useTable must be used within a TableProvider');
  }
  return context;
};

// Provider component
export const TableProvider: React.FC<{ children: React.ReactNode }> = ({ 
  children 
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

  // Fetch tables on mount and set up refresh interval
  useEffect(() => {
    // Initial fetch
    fetchTables();

    // Set up periodic refresh (every 30 seconds)
    const intervalId = setInterval(() => {
      fetchTables();
    }, 30000);

    // Cleanup on unmount
    return () => {
      clearInterval(intervalId);
    };
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
    <TableContext.Provider value={value}>
      {children}
    </TableContext.Provider>
  );
};

export default TableContext;