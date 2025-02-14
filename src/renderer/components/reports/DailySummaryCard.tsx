import React from "react";

interface DailySummaryProps {
  data: {
    totalRevenue: number;
    totalSessions: number;
    averageSessionLength: string;
    topPerformingTable: number;
    totalHoursUsed: number;
    compareYesterday: {
      revenue: number;
      sessions: number;
    };
  };
}

const DailySummaryCard: React.FC<DailySummaryProps> = ({ data }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        Daily Summary
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div>
          <p className="text-sm text-gray-500">Total Revenue</p>
          <p className="text-2xl font-bold text-gray-900">
            ${data.totalRevenue.toFixed(2)}
          </p>
          <p
            className={`text-sm ${
              data.compareYesterday.revenue >= 0
                ? "text-green-600"
                : "text-red-600"
            }`}
          >
            {data.compareYesterday.revenue >= 0 ? "↑" : "↓"}
            {Math.abs(data.compareYesterday.revenue)}% vs yesterday
          </p>
        </div>

        <div>
          <p className="text-sm text-gray-500">Total Sessions</p>
          <p className="text-2xl font-bold text-gray-900">
            {data.totalSessions}
          </p>
          <p
            className={`text-sm ${
              data.compareYesterday.sessions >= 0
                ? "text-green-600"
                : "text-red-600"
            }`}
          >
            {data.compareYesterday.sessions >= 0 ? "↑" : "↓"}
            {Math.abs(data.compareYesterday.sessions)} vs yesterday
          </p>
        </div>

        <div>
          <p className="text-sm text-gray-500">Average Session Length</p>
          <p className="text-2xl font-bold text-gray-900">
            {data.averageSessionLength}
          </p>
        </div>

        <div>
          <p className="text-sm text-gray-500">Total Hours Used</p>
          <p className="text-2xl font-bold text-gray-900">
            {data.totalHoursUsed}h
          </p>
        </div>

        <div>
          <p className="text-sm text-gray-500">Top Table</p>
          <p className="text-2xl font-bold text-gray-900">
            #{data.topPerformingTable}
          </p>
        </div>
      </div>
    </div>
  );
};

export default DailySummaryCard;
