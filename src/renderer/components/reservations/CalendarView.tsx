import React from "react";

interface CalendarViewProps {
  onDateSelect: (date: Date) => void;
  selectedDate: Date;
}

const CalendarView: React.FC<CalendarViewProps> = ({
  onDateSelect,
  selectedDate,
}) => {
  // Mock calendar data
  const days = Array.from({ length: 35 }, (_, i) => new Date(2025, 1, i + 1));
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800">February 2025</h2>
        <div className="flex space-x-2">
          <button className="p-2 hover:bg-gray-100 rounded-full">
            <span>←</span>
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-full">
            <span>→</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center text-sm font-medium text-gray-600 p-2"
          >
            {day}
          </div>
        ))}
        {days.map((date, index) => (
          <button
            key={index}
            onClick={() => onDateSelect(date)}
            className={`
              p-2 text-sm rounded-lg hover:bg-blue-50 transition-colors
              ${
                date.toDateString() === selectedDate.toDateString()
                  ? "bg-blue-500 text-white hover:bg-blue-600"
                  : "text-gray-700"
              }
            `}
          >
            {date.getDate()}
          </button>
        ))}
      </div>
    </div>
  );
};

export default CalendarView;
