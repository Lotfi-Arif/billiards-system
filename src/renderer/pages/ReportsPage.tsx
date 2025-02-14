import React, { useState } from "react";
import RevenueChart from "../components/reports/RevenueChart";
import TableUsageChart from "../components/reports/TableUsageChart";
import DailySummaryCard from "../components/reports/DailySummaryCard";
import PeakHoursChart from "../components/reports/PeakHoursChart";

const ReportsPage: React.FC = () => {
  const [dateRange, setDateRange] = useState("week");

  // Mock data - replace with actual data
  const revenueData = [
    { date: "Mon", revenue: 1200, target: 1000 },
    { date: "Tue", revenue: 1100, target: 1000 },
    { date: "Wed", revenue: 1400, target: 1000 },
    { date: "Thu", revenue: 1300, target: 1000 },
    { date: "Fri", revenue: 1800, target: 1000 },
    { date: "Sat", revenue: 2200, target: 1500 },
    { date: "Sun", revenue: 1900, target: 1500 },
  ];

  const dailySummary = {
    totalRevenue: 1234.56,
    totalSessions: 45,
    averageSessionLength: "1h 45m",
    topPerformingTable: 3,
    totalHoursUsed: 78,
    compareYesterday: {
      revenue: 12.5,
      sessions: -2,
    },
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Reports & Analytics
        </h1>

        <div className="flex space-x-4">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="day">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>

          <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
            Export Report
          </button>
        </div>
      </div>

      {/* Daily Summary */}
      <DailySummaryCard data={dailySummary} />

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <RevenueChart data={revenueData} period="daily" />
        <TableUsageChart
          data={[
            { table: "Table 1", hours: 12, revenue: 360 },
            { table: "Table 2", hours: 8, revenue: 240 },
            { table: "Table 3", hours: 15, revenue: 450 },
            // Add more table data...
          ]}
        />
      </div>

      {/* Peak Hours */}
      <div className="mt-6">
        <PeakHoursChart
          data={[
            { hour: "10AM", tables: 2 },
            { hour: "12PM", tables: 4 },
            { hour: "2PM", tables: 6 },
            { hour: "4PM", tables: 8 },
            { hour: "6PM", tables: 10 },
            { hour: "8PM", tables: 12 },
            { hour: "10PM", tables: 8 },
          ]}
        />
      </div>
    </div>
  );
};

export default ReportsPage;
