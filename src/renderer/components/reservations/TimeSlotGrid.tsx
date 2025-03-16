import React, { useEffect, useState } from "react";
import { useReservations } from "../../contexts/ReservationContext";

interface TimeSlotGridProps {
  onTimeSelect: (time: string) => void;
  selectedTime: string;
  date: Date;
  tableId?: string;
}

const TimeSlotGrid: React.FC<TimeSlotGridProps> = ({
  onTimeSelect,
  selectedTime,
  date,
  tableId,
}) => {
  const { getAvailableTimeSlots, tableAvailability, isLoading, error } =
    useReservations();

  // Local loading state to prevent multiple fetches
  const [isFetching, setIsFetching] = useState(false);

  // Fetch availability data when date or tableId changes
  useEffect(() => {
    const fetchData = async () => {
      if (isFetching) return;

      setIsFetching(true);
      try {
        await getAvailableTimeSlots(date, tableId);
      } finally {
        setIsFetching(false);
      }
    };

    fetchData();
  }, [date, tableId, getAvailableTimeSlots]);

  // Generate time slots from 10 AM to 10 PM
  const timeSlots = Array.from({ length: 13 }, (_, i) => {
    const hour = i + 10;
    return `${hour > 12 ? hour - 12 : hour}:00 ${hour >= 12 ? "PM" : "AM"}`;
  });

  // Check if a time slot is available
  const isSlotAvailable = (time: string): boolean => {
    if (!tableAvailability || isLoading) return false;

    // If tableId is specified, check only that table
    if (tableId && tableAvailability[tableId]) {
      return tableAvailability[tableId].slots[time] || false;
    }

    // Otherwise, check if any table is available for this slot
    return Object.values(tableAvailability).some((table) => table.slots[time]);
  };

  // Count available tables for a specific time slot
  const getAvailableTableCount = (time: string): number => {
    if (!tableAvailability || isLoading) return 0;

    return Object.values(tableAvailability).reduce(
      (count, table) => count + (table.slots[time] ? 1 : 0),
      0
    );
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        Available Time Slots{" "}
        {tableId && tableAvailability?.[tableId]
          ? `for Table ${tableAvailability[tableId].tableNumber}`
          : ""}
      </h3>

      {isLoading || isFetching ? (
        <div className="py-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-2 text-gray-600">Loading available slots...</p>
        </div>
      ) : error ? (
        <div className="py-4 text-center text-red-500">
          Error loading availability data. Please try again.
        </div>
      ) : !tableAvailability || Object.keys(tableAvailability).length === 0 ? (
        <div className="py-4 text-center text-gray-500">
          No availability data found for this date.
        </div>
      ) : (
        <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
          {timeSlots.map((time) => {
            const isAvailable = isSlotAvailable(time);
            const availableCount = getAvailableTableCount(time);

            return (
              <button
                key={time}
                onClick={() => isAvailable && onTimeSelect(time)}
                disabled={!isAvailable}
                className={`
                  p-3 rounded-lg text-sm font-medium transition-colors relative
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
                {isAvailable && !tableId && (
                  <span className="absolute top-1 right-1 text-xs font-normal bg-green-100 text-green-800 px-1 rounded">
                    {availableCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {tableAvailability && Object.keys(tableAvailability).length > 0 && (
        <div className="mt-4 text-sm text-gray-500">
          {!isLoading && tableId && tableAvailability[tableId] ? (
            <p>
              {
                Object.values(tableAvailability[tableId].slots).filter(Boolean)
                  .length
              }{" "}
              available time slots for this table.
            </p>
          ) : (
            <p>Select a time slot to see available tables.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default TimeSlotGrid;
