import React from "react";

interface TimeSlotProps {
  onTimeSelect: (time: string) => void;
  selectedTime: string;
  date: Date;
}

const TimeSlotGrid: React.FC<TimeSlotProps> = ({
  onTimeSelect,
  selectedTime,
  date,
}) => {
  // Mock time slots from 10 AM to 10 PM
  const timeSlots = Array.from({ length: 13 }, (_, i) => {
    const hour = i + 10;
    return `${hour > 12 ? hour - 12 : hour}:00 ${hour >= 12 ? "PM" : "AM"}`;
  });

  const getSlotAvailability = (time: string) => {
    // Mock availability - in real app, this would check against actual bookings
    return Math.random() > 0.3;
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        Available Time Slots
      </h3>
      <div className="grid grid-cols-3 gap-3">
        {timeSlots.map((time) => {
          const isAvailable = getSlotAvailability(time);
          return (
            <button
              key={time}
              onClick={() => isAvailable && onTimeSelect(time)}
              disabled={!isAvailable}
              className={`
                p-3 rounded-lg text-sm font-medium transition-colors
                ${
                  isAvailable
                    ? time === selectedTime
                      ? "bg-blue-500 text-white"
                      : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                }
              `}
            >
              {time}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TimeSlotGrid;
