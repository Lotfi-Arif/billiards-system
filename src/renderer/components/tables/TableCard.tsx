import React from "react";
import { TableStatus } from "@prisma/client";
import { TableWithSessions } from "../../../shared/types/Table";

interface TableCardProps {
  table: TableWithSessions;
  onAction?: (action: "open" | "close" | "reserve" | "maintenance") => void;
  currentUser?: { id: string; role: string };
}

const TableCard: React.FC<TableCardProps> = ({
  table,
  onAction,
  currentUser,
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
      case TableStatus.PRAYER_TIME:
        return "border-blue-500 bg-blue-50";
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
      case TableStatus.PRAYER_TIME:
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const activeSession = table.sessions.find((session) => !session.endTime);

  return (
    <div
      className={`rounded-lg border-2 ${getStatusColor(
        table.status
      )} p-6 shadow-sm hover:shadow-md transition-shadow`}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-800">
            Table {table.number}
          </h3>
          {activeSession && (
            <span className="text-sm text-gray-600">
              {activeSession.type === "TIMED"
                ? `${activeSession.duration} minutes`
                : "Open session"}
            </span>
          )}
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

      {activeSession && (
        <div className="mb-4">
          <span className="text-sm text-gray-600">Started at</span>
          <div className="text-lg font-medium text-gray-800">
            {new Date(activeSession.startTime).toLocaleTimeString()}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 mt-4">
        {table.status === TableStatus.AVAILABLE && currentUser && (
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
        {table.status === TableStatus.IN_USE && currentUser && (
          <button
            onClick={() => onAction?.("close")}
            className="col-span-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition-colors"
          >
            Close Table
          </button>
        )}
        {currentUser?.role === "MANAGER" &&
          table.status !== TableStatus.MAINTENANCE && (
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
