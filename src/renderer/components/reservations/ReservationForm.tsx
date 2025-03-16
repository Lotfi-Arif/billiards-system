import React, { useEffect } from "react";
import { useReservations } from "../../contexts/ReservationContext";
import { useAuth } from "../../contexts/AuthContext"; // Assuming you have an AuthContext

interface ReservationFormProps {
  selectedDate: Date;
  selectedTime: string;
  onSubmit?: () => void;
  onCancel?: () => void;
}

const ReservationForm: React.FC<ReservationFormProps> = ({
  selectedDate,
  selectedTime,
  onSubmit,
  onCancel,
}) => {
  const {
    createReservation,
    getAvailableTimeSlots,
    tableAvailability,
    isLoading,
    error,
    clearError,
  } = useReservations();

  const { currentUser } = useAuth();

  // Create a simple form state instead of using the hook
  const [formData, setFormData] = React.useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    tableId: "",
    numberOfPeople: 2,
    duration: 60, // 1 hour in minutes
    notes: "",
    startTime: new Date(),
  });

  // Update form data when selected date/time changes
  useEffect(() => {
    if (selectedDate && selectedTime) {
      const combinedDateTime = new Date(selectedDate);
      const timeParts = selectedTime.split(" ");
      if (timeParts.length !== 2) return;

      const [hourStr, modifier] = timeParts;
      if (!hourStr) return;

      const hourParts = hourStr.split(":");
      if (hourParts.length === 0) return;

      const parsedHour = Number(hourParts[0]);
      if (isNaN(parsedHour)) return;

      // Convert to 24 hour format
      const hour =
        modifier === "PM" && parsedHour < 12
          ? parsedHour + 12
          : modifier === "AM" && parsedHour === 12
          ? 0
          : parsedHour;

      combinedDateTime.setHours(hour, 0, 0, 0);

      setFormData((prev) => ({
        ...prev,
        startTime: combinedDateTime,
      }));

      // Fetch available tables for this time
      getAvailableTimeSlots(selectedDate);
    }
  }, [selectedDate, selectedTime, getAvailableTimeSlots]);

  // Handle form field changes
  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (error) clearError();
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser) {
      return; // Handle unauthenticated state
    }

    if (!formData.tableId || !formData.startTime) {
      return; // Handle validation error
    }

    // Create reservation DTO
    const reservationData = {
      tableId: formData.tableId,
      userId: currentUser.id,
      startTime: formData.startTime,
      duration: formData.duration,
      customerName: formData.customerName || "Guest",
      customerPhone: formData.customerPhone || "",
      customerEmail: formData.customerEmail || "",
      numberOfPeople: formData.numberOfPeople,
      notes: formData.notes || "",
    };

    const result = await createReservation(reservationData);

    if (result && onSubmit) {
      // Reset form and call success callback
      setFormData({
        customerName: "",
        customerPhone: "",
        customerEmail: "",
        tableId: "",
        numberOfPeople: 2,
        duration: 60,
        notes: "",
        startTime: new Date(),
      });
      onSubmit();
    }
  };

  // Get available tables for the selected time slot
  const getAvailableTablesForTimeSlot = () => {
    if (!tableAvailability || !selectedTime) return [];

    return Object.entries(tableAvailability)
      .filter(([_, tableData]) => tableData.slots[selectedTime])
      .map(([tableId, tableData]) => ({
        id: tableId,
        number: tableData.tableNumber,
      }));
  };

  const availableTables = getAvailableTablesForTimeSlot();

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-lg shadow p-6 space-y-6"
    >
      <h3 className="text-lg font-semibold text-gray-800">
        Reservation Details
      </h3>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error.message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Customer Name
          </label>
          <input
            type="text"
            value={formData.customerName || ""}
            onChange={(e) => handleChange("customerName", e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Phone Number
          </label>
          <input
            type="tel"
            value={formData.customerPhone || ""}
            onChange={(e) => handleChange("customerPhone", e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email
          </label>
          <input
            type="email"
            value={formData.customerEmail || ""}
            onChange={(e) => handleChange("customerEmail", e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Table
          </label>
          <select
            value={formData.tableId || ""}
            onChange={(e) => handleChange("tableId", e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          >
            <option value="">Select a table</option>
            {availableTables.map((table) => (
              <option key={table.id} value={table.id}>
                Table {table.number}
              </option>
            ))}
          </select>
          {selectedTime && availableTables.length === 0 && (
            <p className="mt-1 text-sm text-red-500">
              No tables available for this time slot
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Number of People
          </label>
          <select
            value={formData.numberOfPeople || 2}
            onChange={(e) =>
              handleChange("numberOfPeople", Number(e.target.value))
            }
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {[1, 2, 3, 4, 5, 6].map((num) => (
              <option key={num} value={num}>
                {num}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Duration
          </label>
          <select
            value={formData.duration || 60}
            onChange={(e) => handleChange("duration", Number(e.target.value))}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value={60}>1 hour</option>
            <option value={120}>2 hours</option>
            <option value={180}>3 hours</option>
            <option value={240}>4 hours</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Notes
        </label>
        <textarea
          value={formData.notes || ""}
          onChange={(e) => handleChange("notes", e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          rows={3}
        />
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading || !formData.tableId || !selectedTime}
          className={`
            px-4 py-2 rounded-lg transition-colors
            ${
              isLoading
                ? "bg-blue-300 cursor-not-allowed"
                : !formData.tableId || !selectedTime
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-blue-500 text-white hover:bg-blue-600"
            }
          `}
        >
          {isLoading ? (
            <>
              <span className="inline-block animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></span>
              Processing...
            </>
          ) : (
            "Confirm Reservation"
          )}
        </button>
      </div>
    </form>
  );
};

export default ReservationForm;
