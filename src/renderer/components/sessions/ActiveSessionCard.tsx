import React from "react";
import SessionTimer from "./SessionTimer";
import PricingCard from "./PricingCard";

interface ActiveSessionProps {
  session: {
    id: number;
    tableNumber: number;
    startTime: Date;
    hourlyRate: number;
    status: string;
    customerName?: string;
    extras?: Array<{ name: string; cost: number }>;
  };
  onEndSession: (sessionId: number) => void;
}

const ActiveSessionCard: React.FC<ActiveSessionProps> = ({
  session,
  onEndSession,
}) => {
  const [currentCost, setCurrentCost] = React.useState(0);
  const [timeElapsed, setTimeElapsed] = React.useState(0);

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="bg-blue-500 text-white px-6 py-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-semibold">Table {session.tableNumber}</h3>
          <span className="px-3 py-1 bg-blue-600 rounded-full text-sm">
            {session.status}
          </span>
        </div>
        {session.customerName && (
          <p className="text-blue-100 mt-1">{session.customerName}</p>
        )}
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <SessionTimer
            startTime={session.startTime}
            isActive={session.status === "active"}
            hourlyRate={session.hourlyRate}
            onTimeUpdate={(duration, cost) => {
              setTimeElapsed(duration);
              setCurrentCost(cost);
            }}
          />

          <button
            onClick={() => onEndSession(session.id)}
            className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            End Session
          </button>
        </div>

        <PricingCard
          hourlyRate={session.hourlyRate}
          currentCost={currentCost}
          timeElapsed={timeElapsed}
          extras={session.extras}
        />
      </div>
    </div>
  );
};

export default ActiveSessionCard;
