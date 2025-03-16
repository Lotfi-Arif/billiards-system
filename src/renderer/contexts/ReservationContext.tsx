// src/renderer/contexts/ReservationContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import {
  ReservationWithRelations,
  CreateReservationDTO,
  UpdateReservationDTO,
  TableAvailability,
} from "@shared/types/Reservation";
import { useAuth } from "./AuthContext"; // Assuming you have an AuthContext

interface ReservationContextType {
  reservations: ReservationWithRelations[];
  upcomingReservations: ReservationWithRelations[];
  selectedReservation: ReservationWithRelations | null;
  tableAvailability: TableAvailability | null;
  isLoading: boolean;
  error: Error | null;

  // Fetch methods
  fetchReservations: () => Promise<void>;
  fetchReservationsByDate: (date: Date) => Promise<void>;
  fetchReservationById: (id: string) => Promise<void>;
  fetchUpcomingReservations: () => Promise<void>;
  getAvailableTimeSlots: (
    date: Date,
    tableId?: string
  ) => Promise<TableAvailability | null>;

  // Mutation methods
  createReservation: (
    data: CreateReservationDTO
  ) => Promise<ReservationWithRelations | null>;
  updateReservation: (
    id: string,
    data: UpdateReservationDTO
  ) => Promise<ReservationWithRelations | null>;
  cancelReservation: (id: string) => Promise<ReservationWithRelations | null>;
  completeReservation: (id: string) => Promise<ReservationWithRelations | null>;

  // UI state methods
  setSelectedReservation: (
    reservation: ReservationWithRelations | null
  ) => void;
  clearError: () => void;
}

const ReservationContext = createContext<ReservationContextType | undefined>(
  undefined
);

export const ReservationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [reservations, setReservations] = useState<ReservationWithRelations[]>(
    []
  );
  const [upcomingReservations, setUpcomingReservations] = useState<
    ReservationWithRelations[]
  >([]);
  const [selectedReservation, setSelectedReservation] =
    useState<ReservationWithRelations | null>(null);
  const [tableAvailability, setTableAvailability] =
    useState<TableAvailability | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { currentUser } = useAuth(); // Get current user from AuthContext
  const electron = window.electron;

  // Fetch all reservations
  const fetchReservations = async () => {
    try {
      setIsLoading(true);
      const response = await electron.getAllReservations();

      if (response.success && response.data) {
        setReservations(response.data);
      } else {
        throw new Error(response.error || "Failed to fetch reservations");
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch reservations by date
  const fetchReservationsByDate = async (date: Date) => {
    try {
      setIsLoading(true);
      const response = await electron.getReservationsByDate(date);

      if (response.success && response.data) {
        setReservations(response.data);
      } else {
        throw new Error(
          response.error || "Failed to fetch reservations by date"
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch a single reservation by ID
  const fetchReservationById = async (id: string) => {
    try {
      setIsLoading(true);
      const response = await electron.getReservationById(id);

      if (response.success && response.data) {
        setSelectedReservation(response.data);
      } else if (response.success && !response.data) {
        setSelectedReservation(null);
      } else {
        throw new Error(response.error || "Failed to fetch reservation");
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch upcoming reservations
  const fetchUpcomingReservations = async () => {
    try {
      setIsLoading(true);
      const response = await electron.getUpcomingReservations();

      if (response.success && response.data) {
        setUpcomingReservations(response.data);
      } else {
        throw new Error(
          response.error || "Failed to fetch upcoming reservations"
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setIsLoading(false);
    }
  };

  // Get available time slots for tables
  const getAvailableTimeSlots = async (
    date: Date,
    tableId?: string
  ): Promise<TableAvailability | null> => {
    try {
      setIsLoading(true);
      const response = await electron.getAvailableTimeSlots(date, tableId);

      if (response.success && response.data) {
        setTableAvailability(response.data);
        return response.data;
      } else {
        throw new Error(
          response.error || "Failed to fetch available time slots"
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Create a new reservation
  const createReservation = async (
    data: CreateReservationDTO
  ): Promise<ReservationWithRelations | null> => {
    if (!currentUser) {
      setError(new Error("User not authenticated"));
      return null;
    }

    try {
      setIsLoading(true);
      const response = await electron.createReservation(data, currentUser.id);

      if (response.success && response.data) {
        // Refresh the reservation lists
        await fetchReservations();
        await fetchUpcomingReservations();
        return response.data;
      } else {
        throw new Error(response.error || "Failed to create reservation");
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Update an existing reservation
  const updateReservation = async (
    id: string,
    data: UpdateReservationDTO
  ): Promise<ReservationWithRelations | null> => {
    if (!currentUser) {
      setError(new Error("User not authenticated"));
      return null;
    }

    try {
      setIsLoading(true);
      const response = await electron.updateReservation(
        id,
        data,
        currentUser.id
      );

      if (response.success && response.data) {
        // Update the reservation in the lists
        setReservations((prev) =>
          prev.map((res) => (res.id === id ? response.data! : res))
        );
        setUpcomingReservations((prev) =>
          prev.map((res) => (res.id === id ? response.data! : res))
        );

        // Update selected reservation if it's the one being updated
        if (selectedReservation?.id === id) {
          setSelectedReservation(response.data);
        }

        return response.data;
      } else {
        throw new Error(response.error || "Failed to update reservation");
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Cancel a reservation
  const cancelReservation = async (
    id: string
  ): Promise<ReservationWithRelations | null> => {
    if (!currentUser) {
      setError(new Error("User not authenticated"));
      return null;
    }

    try {
      setIsLoading(true);
      const response = await electron.cancelReservation(id, currentUser.id);

      if (response.success && response.data) {
        // Remove from upcoming reservations and update status in all reservations
        setUpcomingReservations((prev) => prev.filter((res) => res.id !== id));
        setReservations((prev) =>
          prev.map((res) => (res.id === id ? response.data! : res))
        );

        // Update selected reservation if it's the one being cancelled
        if (selectedReservation?.id === id) {
          setSelectedReservation(response.data);
        }

        return response.data;
      } else {
        throw new Error(response.error || "Failed to cancel reservation");
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Complete a reservation
  const completeReservation = async (
    id: string
  ): Promise<ReservationWithRelations | null> => {
    if (!currentUser) {
      setError(new Error("User not authenticated"));
      return null;
    }

    try {
      setIsLoading(true);
      const response = await electron.completeReservation(id, currentUser.id);

      if (response.success && response.data) {
        // Remove from upcoming reservations and update status in all reservations
        setUpcomingReservations((prev) => prev.filter((res) => res.id !== id));
        setReservations((prev) =>
          prev.map((res) => (res.id === id ? response.data! : res))
        );

        // Update selected reservation if it's the one being completed
        if (selectedReservation?.id === id) {
          setSelectedReservation(response.data);
        }

        return response.data;
      } else {
        throw new Error(response.error || "Failed to complete reservation");
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Clear any errors
  const clearError = () => {
    setError(null);
  };

  // Load initial data
  useEffect(() => {
    fetchReservations();
    fetchUpcomingReservations();
  }, []);

  // Register WebSocket event listener for reservation updates
  useEffect(() => {
    if (electron.onTableUpdate) {
      // Handle reservation updates via WebSocket
      const unsubscribe = electron.onTableUpdate((updatedTable) => {
        // Refresh reservations when a table status changes
        fetchReservations();
        fetchUpcomingReservations();
      });

      return unsubscribe;
    }
  }, []);

  const value = {
    reservations,
    upcomingReservations,
    selectedReservation,
    tableAvailability,
    isLoading,
    error,
    fetchReservations,
    fetchReservationsByDate,
    fetchReservationById,
    fetchUpcomingReservations,
    getAvailableTimeSlots,
    createReservation,
    updateReservation,
    cancelReservation,
    completeReservation,
    setSelectedReservation,
    clearError,
  };

  return (
    <ReservationContext.Provider value={value}>
      {children}
    </ReservationContext.Provider>
  );
};

export const useReservations = () => {
  const context = useContext(ReservationContext);
  if (context === undefined) {
    throw new Error(
      "useReservations must be used within a ReservationProvider"
    );
  }
  return context;
};
