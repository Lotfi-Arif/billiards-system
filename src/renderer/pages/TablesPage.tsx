import React from "react";
import TableGrid from "../components/tables/TableGrid";

const TablesPage: React.FC = () => {
  const handleTableAction = (
    tableId: number,
    action: "open" | "close" | "reserve"
  ) => {
    console.log(`Table ${tableId} - Action: ${action}`);
    // Handle the action here
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <TableGrid />
    </div>
  );
};

export default TablesPage;
