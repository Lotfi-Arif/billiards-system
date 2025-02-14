// src/renderer/pages/ReservationsPage.tsx
import React, { useState } from "react";
import CalendarView from "../components/reservations/CalendarView";
import TimeSlotGrid from "../components/reservations/TimeSlotGrid";
import ReservationForm from "../components/reservations/ReservationForm";

const ReservationsPage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState("");
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = (formData: any) => {
    console.log("Reservation submitted:", formData);
    // Handle reservation submission
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
            onDateSelect={setSelectedDate}
          />

          <TimeSlotGrid
            date={selectedDate}
            selectedTime={selectedTime}
            onTimeSelect={(time) => {
              setSelectedTime(time);
              setShowForm(true);
            }}
          />
        </div>

        {showForm && (
          <div>
            <ReservationForm
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              onSubmit={handleSubmit}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ReservationsPage;
