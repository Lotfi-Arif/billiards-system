import { useState, useCallback } from "react";
import { useReservations } from "../contexts/ReservationContext";
import { useAuth } from "../contexts/AuthContext"; // Assuming you have an AuthContext
import {
  CreateReservationDTO,
  UpdateReservationDTO,
} from "@shared/types/Reservation";
import { ReservationStatus } from "@prisma/client";

// Hook for reservation form management
export const useReservationForm = (onSuccess?: () => void) => {
  const { createReservation, error, clearError, isLoading } = useReservations();
  const { currentUser } = useAuth();

  // Initial form state
  const [formData, setFormData] = useState<Partial<CreateReservationDTO>>({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    tableId: "",
    numberOfPeople: 2,
    duration: 60, // 1 hour in minutes
    notes: "",
  });

  // Form submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser) {
      // Handle unauthenticated state
      return;
    }

    if (!formData.tableId || !formData.startTime) {
      // Handle validation error
      return;
    }

    // Create the reservation DTO
    const reservationData: CreateReservationDTO = {
      tableId: formData.tableId!,
      userId: currentUser.id,
      startTime: formData.startTime,
      duration: formData.duration || 60,
      customerName: formData.customerName || "Guest",
      customerPhone: formData.customerPhone || "",
      customerEmail: formData.customerEmail || "",
      numberOfPeople: formData.numberOfPeople || 2,
      notes: formData.notes || "",
    };

    const result = await createReservation(reservationData);

    if (result && onSuccess) {
      // Reset form and call success callback
      setFormData({
        customerName: "",
        customerPhone: "",
        customerEmail: "",
        tableId: "",
        numberOfPeople: 2,
        duration: 60,
        notes: "",
      });
      onSuccess();
    }
  };

  // Form field change handler
  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear any previous errors when user makes changes
    if (error) clearError();
  };

  return {
    formData,
    setFormData,
    handleChange,
    handleSubmit,
    isLoading,
    error,
  };
};

// Hook for reservation management actions (cancel, complete, etc.)
export const useReservationActions = () => {
  const {
    cancelReservation,
    completeReservation,
    updateReservation,
    isLoading,
    error,
    clearError,
  } = useReservations();
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Cancel a reservation
  const handleCancel = async (id: string, onSuccess?: () => void) => {
    setActionInProgress(id);
    try {
      const result = await cancelReservation(id);
      if (result && onSuccess) onSuccess();
    } finally {
      setActionInProgress(null);
    }
  };

  // Complete a reservation
  const handleComplete = async (id: string, onSuccess?: () => void) => {
    setActionInProgress(id);
    try {
      const result = await completeReservation(id);
      if (result && onSuccess) onSuccess();
    } finally {
      setActionInProgress(null);
    }
  };

  // Update reservation status
  const handleStatusChange = async (
    id: string,
    status: ReservationStatus,
    onSuccess?: () => void
  ) => {
    setActionInProgress(id);
    try {
      const result = await updateReservation(id, { status });
      if (result && onSuccess) onSuccess();
    } finally {
      setActionInProgress(null);
    }
  };

  // Update reservation details
  const handleUpdateDetails = async (
    id: string,
    data: UpdateReservationDTO,
    onSuccess?: () => void
  ) => {
    setActionInProgress(id);
    try {
      const result = await updateReservation(id, data);
      if (result && onSuccess) onSuccess();
    } finally {
      setActionInProgress(null);
    }
  };

  return {
    handleCancel,
    handleComplete,
    handleStatusChange,
    handleUpdateDetails,
    actionInProgress,
    isLoading,
    error,
    clearError,
  };
};

// Hook for available time slot management
export const useAvailableTimeSlots = () => {
  const { getAvailableTimeSlots, tableAvailability, isLoading, error } =
    useReservations();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [selectedTableId, setSelectedTableId] = useState<string>("");

  // Fetch available time slots when date or table changes
  const fetchAvailability = useCallback(async () => {
    await getAvailableTimeSlots(selectedDate, selectedTableId || undefined);
  }, [selectedDate, selectedTableId, getAvailableTimeSlots]);

  // Check if a specific time slot is available for a table
  const isTimeSlotAvailable = useCallback(
    (tableId: string, timeSlot: string) => {
      if (!tableAvailability || !tableAvailability[tableId]) return false;
      return tableAvailability[tableId].slots[timeSlot];
    },
    [tableAvailability]
  );

  // Get all available tables for a specific time slot
  const getAvailableTablesForTimeSlot = useCallback(
    (timeSlot: string) => {
      if (!tableAvailability) return [];

      return Object.entries(tableAvailability)
        .filter(([_, tableData]) => tableData.slots[timeSlot])
        .map(([tableId, tableData]) => ({
          id: tableId,
          number: tableData.tableNumber,
        }));
    },
    [tableAvailability]
  );

  // Get all available time slots for a specific table
  const getAvailableTimeSlotsForTable = useCallback(
    (tableId: string) => {
      if (!tableAvailability || !tableAvailability[tableId]) return [];

      return Object.entries(tableAvailability[tableId].slots)
        .filter(([_, isAvailable]) => isAvailable)
        .map(([timeSlot]) => timeSlot);
    },
    [tableAvailability]
  );

  return {
    selectedDate,
    setSelectedDate,
    selectedTime,
    setSelectedTime,
    selectedTableId,
    setSelectedTableId,
    fetchAvailability,
    isTimeSlotAvailable,
    getAvailableTablesForTimeSlot,
    getAvailableTimeSlotsForTable,
    tableAvailability,
    isLoading,
    error,
  };
};
