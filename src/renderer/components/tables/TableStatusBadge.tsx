import React from "react";
import { TableStatus } from "@prisma/client";

interface TableStatusBadgeProps {
  status: TableStatus;
  count: number;
}

const TableStatusBadge: React.FC<TableStatusBadgeProps> = ({
  status,
  count,
}) => {
  const getStatusStyles = (status: TableStatus) => {
    switch (status) {
      case TableStatus.AVAILABLE:
        return "bg-green-100 text-green-800 border-green-200";
      case TableStatus.IN_USE:
        return "bg-red-100 text-red-800 border-red-200";
      case TableStatus.RESERVED:
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case TableStatus.MAINTENANCE:
        return "bg-gray-100 text-gray-800 border-gray-200";
      case TableStatus.PRAYER_TIME:
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div
      className={`px-3 py-1 rounded-full border ${getStatusStyles(
        status
      )} flex items-center space-x-2`}
    >
      <span className="capitalize text-sm font-medium">
        {status.toLowerCase().replace("_", " ")}
      </span>
      <span className="bg-white px-2 py-0.5 rounded-full text-xs font-bold">
        {count}
      </span>
    </div>
  );
};

export default TableStatusBadge;
