// src/renderer/components/tables/TableStatusBadge.tsx
import React from "react";

interface TableStatusBadgeProps {
  status: string;
  count: number;
}

const TableStatusBadge: React.FC<TableStatusBadgeProps> = ({
  status,
  count,
}) => {
  const getStatusStyles = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-100 text-green-800 border-green-200";
      case "occupied":
        return "bg-red-100 text-red-800 border-red-200";
      case "reserved":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "maintenance":
        return "bg-gray-100 text-gray-800 border-gray-200";
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
      <span className="capitalize text-sm font-medium">{status}</span>
      <span className="bg-white px-2 py-0.5 rounded-full text-xs font-bold">
        {count}
      </span>
    </div>
  );
};

export default TableStatusBadge;
