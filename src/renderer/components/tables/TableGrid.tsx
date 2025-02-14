import React from "react";
import { TableStatus } from "../../../shared/types/Table";
import TableCard from "./TableCard";
import TableStatusBadge from "./TableStatusBadge";
import { useTables } from "../../contexts/TableContext";

const TableGrid: React.FC = () => {
  const { tables, loading, error, openTable, closeTable, setTableMaintenance } =
    useTables();

  const handleTableAction = async (
    tableId: number,
    action: "open" | "close" | "reserve" | "maintenance" | "cooldown"
  ) => {
    try {
      switch (action) {
        case "open":
          await openTable(tableId);
          break;
        case "close":
          await closeTable(tableId);
          break;
        case "maintenance":
          await setTableMaintenance(tableId);
          break;
      }
    } catch (error) {
      console.error(`Error handling table action: ${action}`, error);
    }
  };

  const getStatusCounts = () => {
    if (!tables.data) return {};

    return tables.data.reduce((acc, table) => {
      acc[table.status] = (acc[table.status] || 0) + 1;
      return acc;
    }, {} as Record<TableStatus, number>);
  };

  if (loading) {
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
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-red-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">{error}</p>
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
          <TableStatusBadge
            status={TableStatus.AVAILABLE}
            count={statusCounts[TableStatus.AVAILABLE] || 0}
          />
          <TableStatusBadge
            status={TableStatus.IN_USE}
            count={statusCounts[TableStatus.IN_USE] || 0}
          />
          <TableStatusBadge
            status={TableStatus.RESERVED}
            count={statusCounts[TableStatus.RESERVED] || 0}
          />
          <TableStatusBadge
            status={TableStatus.MAINTENANCE}
            count={statusCounts[TableStatus.MAINTENANCE] || 0}
          />
          <TableStatusBadge
            status={TableStatus.COOLDOWN}
            count={statusCounts[TableStatus.COOLDOWN] || 0}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {tables.data?.map((table) => (
          <TableCard
            key={table.id}
            table={table}
            onAction={(action) => handleTableAction(table.id, action)}
          />
        ))}
      </div>
    </div>
  );
};

export default TableGrid;
