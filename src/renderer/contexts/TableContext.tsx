// src/renderer/contexts/TableContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { TableWithSessions } from '@/shared/types/Table';
import { useWebSocket } from '../hooks/useWebSocket';
import { WebSocketEvents } from '@/shared/types/websocket';
import { useElectron } from '../hooks/useElectron';

interface TableContextType {
  tables: TableWithSessions[];
  isLoading: boolean;
  error: Error | null;
  refreshTables: () => Promise<void>;
}

const TableContext = createContext<TableContextType | undefined>(undefined);

export const TableProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tables, setTables] = useState<TableWithSessions[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const { subscribe } = useWebSocket(
    (message) => message.event === WebSocketEvents.TABLE_UPDATED
  );
  const electron = window.electron;

  const fetchTables = async () => {
    try {
      setIsLoading(true);
      const response = await electron.getTables();
      if (response.success && response.data) {
        setTables(response.data);
      } else {
        throw new Error(response.error || 'Failed to fetch tables');
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();

    const unsubscribe = subscribe((message) => {
      if (message.event === WebSocketEvents.TABLE_UPDATED) {
        setTables(current => 
          current.map(table => 
            table.id === message.data.id ? message.data : table
          )
        );
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const value = {
    tables,
    isLoading,
    error,
    refreshTables: fetchTables,
  };

  return (
    <TableContext.Provider value={value}>
      {children}
    </TableContext.Provider>
  );
};

export const useTables = () => {
  const context = useContext(TableContext);
  if (context === undefined) {
    throw new Error('useTables must be used within a TableProvider');
  }
  return context;
};