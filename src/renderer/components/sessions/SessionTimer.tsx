import React, { useState, useEffect } from "react";

interface SessionTimerProps {
  startTime: Date;
  isActive: boolean;
  hourlyRate: number;
  onTimeUpdate?: (duration: number, cost: number) => void;
}

const SessionTimer: React.FC<SessionTimerProps> = ({
  startTime,
  isActive,
  hourlyRate,
  onTimeUpdate,
}) => {
  const [elapsed, setElapsed] = useState<number>(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isActive) {
      interval = setInterval(() => {
        const now = new Date();
        const elapsedTime = Math.floor(
          (now.getTime() - startTime.getTime()) / 1000
        );
        setElapsed(elapsedTime);

        // Calculate cost
        const hours = elapsedTime / 3600;
        const cost = hours * hourlyRate;
        onTimeUpdate?.(elapsedTime, cost);
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isActive, startTime, hourlyRate]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, "0")}:${m
      .toString()
      .padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="text-center p-4 bg-white rounded-lg shadow-sm">
      <div className="text-4xl font-mono font-bold text-blue-600">
        {formatTime(elapsed)}
      </div>
      <div className="text-sm text-gray-500 mt-2">
        Started at {startTime.toLocaleTimeString()}
      </div>
    </div>
  );
};

export default SessionTimer;
