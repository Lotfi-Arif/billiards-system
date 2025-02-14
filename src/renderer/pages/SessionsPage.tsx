import React from "react";
import ActiveSessionCard from "../components/sessions/ActiveSessionCard";

const SessionsPage: React.FC = () => {
  // Mock data for demonstration
  const activeSessions = [
    {
      id: 1,
      tableNumber: 3,
      startTime: new Date(Date.now() - 45 * 60000), // 45 minutes ago
      hourlyRate: 30,
      status: "active",
      customerName: "John Doe",
      extras: [
        { name: "Cue Rental", cost: 5 },
        { name: "Drinks", cost: 8 },
      ],
    },
    {
      id: 2,
      tableNumber: 5,
      startTime: new Date(Date.now() - 120 * 60000), // 2 hours ago
      hourlyRate: 30,
      status: "active",
      customerName: "Jane Smith",
    },
  ];

  const handleEndSession = (sessionId: number) => {
    console.log(`Ending session ${sessionId}`);
    // Handle session end logic
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Active Sessions</h1>
        <div className="text-sm text-gray-600">
          {activeSessions.length} active sessions
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {activeSessions.map((session) => (
          <ActiveSessionCard
            key={session.id}
            session={session}
            onEndSession={handleEndSession}
          />
        ))}
      </div>
    </div>
  );
};

export default SessionsPage;
