import React from "react";
import { TableStatus } from "@prisma/client";
import TableCard from "./TableCard";
import TableStatusBadge from "./TableStatusBadge";
import { useElectron } from "@/hooks/useElectron";
import { useAuth } from "@/renderer/contexts/AuthContext";

const TableGrid: React.FC = () => {
  const {
    data: tables,
    isLoading,
    error,
  } = useElectron((api) => api.getTables());
  const { currentUser } = useAuth();

  const handleTableAction = async (
    tableId: string,
    action: "open" | "close" | "reserve" | "maintenance"
  ) => {
    if (!currentUser) return;

    try {
      switch (action) {
        case "open":
          await window.electron.openTable(tableId, currentUser.id, "TIMED", 60);
          break;
        case "close":
          await window.electron.closeTable(tableId, currentUser.id);
          break;
        case "maintenance":
          await window.electron.setTableMaintenance(tableId, currentUser.id);
          break;
      }
    } catch (error) {
      console.error(`Error handling table action: ${action}`, error);
    }
  };

  const getStatusCounts = () => {
    if (!tables) return {};
    return tables.reduce((acc, table) => {
      acc[table.status] = (acc[table.status] || 0) + 1;
      return acc;
    }, {} as Record<TableStatus, number>);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-600">Loading tables...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4 my-4">
        <div className="flex">
          <div className="ml-3">
            <p className="text-sm text-red-700">{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  const statusCounts = getStatusCounts();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Pool Tables</h2>
        <div className="flex space-x-2">
          {Object.values(TableStatus).map((status) => (
            <TableStatusBadge
              key={status}
              status={status}
              count={statusCounts[status] || 0}
            />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {tables?.map((table) => (
          <TableCard
            key={table.id}
            table={table}
            onAction={(action) => handleTableAction(table.id, action)}
            currentUser={currentUser}
          />
        ))}
      </div>
    </div>
  );
};

export default TableGrid;
