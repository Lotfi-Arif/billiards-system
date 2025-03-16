import React, { useState, useEffect } from "react";
import CalendarView from "../components/reservations/CalendarView";
import TimeSlotGrid from "../components/reservations/TimeSlotGrid";
import ReservationForm from "../components/reservations/ReservationForm";
import { useReservations } from "../contexts/ReservationContext";
import { ReservationStatus } from "@prisma/client";

const ReservationsPage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState("");
  const [showForm, setShowForm] = useState(false);

  const { reservations, fetchReservationsByDate, isLoading } =
    useReservations();

  // Load reservations for the selected date
  useEffect(() => {
    fetchReservationsByDate(selectedDate);
  }, [selectedDate, fetchReservationsByDate]);

  // Handle date selection
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setSelectedTime(""); // Reset time selection when date changes
    setShowForm(false);
  };

  // Handle time selection
  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setShowForm(true);
  };

  // Handle successful form submission
  const handleFormSuccess = () => {
    setShowForm(false);
    setSelectedTime("");
    // Refresh the reservations data
    fetchReservationsByDate(selectedDate);
  };

  // Handle form cancellation
  const handleFormCancel = () => {
    setShowForm(false);
  };

  // Format date for display
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        Make a Reservation
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <CalendarView
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
          />

          <TimeSlotGrid
            date={selectedDate}
            selectedTime={selectedTime}
            onTimeSelect={handleTimeSelect}
          />

          {/* Today's Reservations Summary */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Reservations for {formatDate(selectedDate)}
            </h3>

            {isLoading ? (
              <div className="py-4 text-center">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : reservations.length === 0 ? (
              <p className="text-gray-500 py-4">
                No reservations for this date.
              </p>
            ) : (
              <div className="space-y-3">
                {reservations.map((reservation) => (
                  <div
                    key={reservation.id}
                    className={`
                      p-3 rounded-lg border text-sm
                      ${
                        reservation.status === ReservationStatus.CANCELLED
                          ? "bg-gray-50 border-gray-200 text-gray-500"
                          : reservation.status === ReservationStatus.COMPLETED
                          ? "bg-green-50 border-green-200"
                          : "bg-blue-50 border-blue-200"
                      }
                    `}
                  >
                    <div className="flex justify-between">
                      <span className="font-medium">
                        {new Date(reservation.startTime).toLocaleTimeString(
                          "en-US",
                          {
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true,
                          }
                        )}
                      </span>
                      <span className="text-xs px-2 py-1 rounded bg-white">
                        Table {reservation.table.number}
                      </span>
                    </div>
                    <div className="mt-1">
                      {reservation.customerName} • {reservation.numberOfPeople}{" "}
                      {reservation.numberOfPeople === 1 ? "person" : "people"}
                    </div>
                    <div className="mt-1 text-xs flex justify-between">
                      <span>{reservation.duration} mins</span>
                      <span>{reservation.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          {showForm ? (
            <ReservationForm
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              onSubmit={handleFormSuccess}
              onCancel={handleFormCancel}
            />
          ) : (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Make a Reservation
              </h3>
              <p className="text-gray-600">
                Please select a date and time from the calendar to make a
                reservation.
              </p>
              <div className="mt-6 border-t border-gray-200 pt-4">
                <h4 className="font-medium text-gray-700 mb-2">
                  How it works:
                </h4>
                <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
                  <li>Select a date from the calendar</li>
                  <li>Choose an available time slot</li>
                  <li>Fill in your details and select a table</li>
                  <li>Confirm your reservation</li>
                </ol>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReservationsPage;
