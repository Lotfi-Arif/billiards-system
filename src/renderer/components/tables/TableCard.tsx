import React from "react";
import { Table, TableStatus } from "../../../shared/types/Table";

interface TableCardProps {
  table: Table;
  onAction?: (
    action: "open" | "close" | "reserve" | "maintenance" | "cooldown"
  ) => void;
  timeRemaining?: string;
  reservedFor?: string;
}

const TableCard: React.FC<TableCardProps> = ({
  table,
  onAction,
  timeRemaining,
  reservedFor,
}) => {
  const getStatusColor = (status: TableStatus) => {
    switch (status) {
      case TableStatus.AVAILABLE:
        return "border-green-500 bg-green-50";
      case TableStatus.IN_USE:
        return "border-red-500 bg-red-50";
      case TableStatus.RESERVED:
        return "border-yellow-500 bg-yellow-50";
      case TableStatus.MAINTENANCE:
        return "border-gray-500 bg-gray-50";
      case TableStatus.COOLDOWN:
        return "border-purple-500 bg-purple-50";
      case TableStatus.OFF:
        return "border-gray-300 bg-gray-50";
      default:
        return "border-gray-300";
    }
  };

  const getStatusBadgeColor = (status: TableStatus) => {
    switch (status) {
      case TableStatus.AVAILABLE:
        return "bg-green-100 text-green-800";
      case TableStatus.IN_USE:
        return "bg-red-100 text-red-800";
      case TableStatus.RESERVED:
        return "bg-yellow-100 text-yellow-800";
      case TableStatus.MAINTENANCE:
        return "bg-gray-100 text-gray-800";
      case TableStatus.COOLDOWN:
        return "bg-purple-100 text-purple-800";
      case TableStatus.OFF:
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div
      className={`rounded-lg border-2 ${getStatusColor(
        table.status
      )} p-6 shadow-sm hover:shadow-md transition-shadow`}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-800">
            Table {table.tableNumber}
          </h3>
          <span className="text-sm text-gray-600">
            ${table.hourlyRate}/hour
          </span>
        </div>
        <div className="flex items-center">
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeColor(
              table.status
            )}`}
          >
            {table.status}
          </span>
        </div>
      </div>

      {timeRemaining && (
        <div className="mb-4 text-center">
          <span className="text-sm text-gray-600">Time Remaining</span>
          <div className="text-2xl font-bold text-gray-800">
            {timeRemaining}
          </div>
        </div>
      )}

      {reservedFor && (
        <div className="mb-4 text-center">
          <span className="text-sm text-gray-600">Reserved for</span>
          <div className="text-lg font-medium text-gray-800">{reservedFor}</div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 mt-4">
        {table.status === TableStatus.AVAILABLE && (
          <>
            <button
              onClick={() => onAction?.("open")}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors"
            >
              Open
            </button>
            <button
              onClick={() => onAction?.("reserve")}
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded transition-colors"
            >
              Reserve
            </button>
          </>
        )}
        {table.status === TableStatus.IN_USE && (
          <button
            onClick={() => onAction?.("close")}
            className="col-span-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition-colors"
          >
            Close Table
          </button>
        )}
        {table.status !== TableStatus.MAINTENANCE &&
          table.status !== TableStatus.COOLDOWN && (
            <button
              onClick={() => onAction?.("maintenance")}
              className="col-span-2 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded transition-colors mt-2"
            >
              Set Maintenance
            </button>
          )}
      </div>
    </div>
  );
};

export default TableCard;
