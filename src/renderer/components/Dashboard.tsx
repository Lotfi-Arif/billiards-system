import React from "react";
import TableGrid from "./tables/TableGrid";
import { useElectron } from "@/hooks/useElectron";
import { SessionStatus, TableStatus } from "@prisma/client";

const Dashboard: React.FC = () => {
  const { data: tables, isLoading: tablesLoading } = useElectron((api) =>
    api.getTables()
  );
  const { data: sessions, isLoading: sessionsLoading } = useElectron((api) =>
    api.getActiveSessions()
  );

  // Calculate summary statistics
  const summaryStats = React.useMemo(() => {
    if (!tables || !sessions)
      return {
        activeTables: 0,
        totalTables: 0,
        todayRevenue: 0,
        pendingReservations: 0,
      };

    const activeTables = tables.filter(
      (t) => t.status === TableStatus.IN_USE
    ).length;
    const totalTables = tables.length;

    // Calculate today's revenue from active and completed sessions
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayRevenue = sessions.reduce((sum, session) => {
      if (session.startTime >= today && session.cost) {
        return sum + session.cost;
      }
      return sum;
    }, 0);

    const pendingReservations = tables.filter(
      (t) => t.status === TableStatus.RESERVED
    ).length;

    return {
      activeTables,
      totalTables,
      todayRevenue,
      pendingReservations,
    };
  }, [tables, sessions]);

  if (tablesLoading || sessionsLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Summary Cards */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800">Active Tables</h3>
          <p className="text-3xl font-bold text-blue-500 mt-2">
            {summaryStats.activeTables}/{summaryStats.totalTables}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800">
            Today's Revenue
          </h3>
          <p className="text-3xl font-bold text-green-500 mt-2">
            ${summaryStats.todayRevenue.toFixed(2)}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800">
            Pending Reservations
          </h3>
          <p className="text-3xl font-bold text-yellow-500 mt-2">
            {summaryStats.pendingReservations}
          </p>
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
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Cost
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sessions
                ?.filter((session) => session.status === SessionStatus.ACTIVE)
                .map((session) => {
                  const duration = session.endTime
                    ? Math.floor(
                        (new Date(session.endTime).getTime() -
                          new Date(session.startTime).getTime()) /
                          (1000 * 60)
                      )
                    : Math.floor(
                        (Date.now() - new Date(session.startTime).getTime()) /
                          (1000 * 60)
                      );

                  return (
                    <tr key={session.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        Table{" "}
                        {tables?.find((t) => t.id === session.tableId)?.number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {new Date(session.startTime).toLocaleTimeString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {Math.floor(duration / 60)}h {duration % 60}m
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {session.type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        ${session.cost?.toFixed(2) || "0.00"}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
