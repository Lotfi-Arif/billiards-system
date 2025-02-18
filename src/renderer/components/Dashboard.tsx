import React from "react";
import TableGrid from "./tables/TableGrid";

interface Table {
  id: number;
  number: number;
  status: "available" | "occupied" | string;
}

interface Session {
  id: number;
  tableId: number;
  startTime: string;
  endTime?: string;
  cost?: number;
  status: "active" | "completed" | string;
}

const Dashboard: React.FC = () => {
  const handleTableAction = (
    tableId: number,
    action: "open" | "close" | "reserve"
  ) => {
    try {
      switch (action) {
        case "open":
          window.electron.openTable(tableId);
          break;
        case "close":
          window.electron.closeTable(tableId);
          break;
        case "reserve":
          // Handle reservation
          break;
      }
    } catch (error) {
      console.error(`Error handling table action: ${action}`, error);
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Summary Cards */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800">Active Tables</h3>
          <p className="text-3xl font-bold text-blue-500 mt-2">6/12</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800">
            Today's Revenue
          </h3>
          <p className="text-3xl font-bold text-green-500 mt-2">$580</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800">
            Pending Reservations
          </h3>
          <p className="text-3xl font-bold text-yellow-500 mt-2">3</p>
        </div>
      </div>

      {/* Table Grid */}
      <TableGrid />

      {/* Active Sessions */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Active Sessions
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Table
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Start Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Cost
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {/* Sample row - this would be mapped from actual data */}
              <tr>
                <td className="px-6 py-4 whitespace-nowrap">Table 1</td>
                <td className="px-6 py-4 whitespace-nowrap">14:30</td>
                <td className="px-6 py-4 whitespace-nowrap">1h 30m</td>
                <td className="px-6 py-4 whitespace-nowrap">$45.00</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button className="text-red-600 hover:text-red-900">
                    End Session
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
