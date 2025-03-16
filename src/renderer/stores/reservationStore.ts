import { create } from "zustand";
import { ReservationStatus } from "@prisma/client";
import {
  ReservationWithRelations,
  CreateReservationDTO,
  UpdateReservationDTO,
  TableAvailability,
} from "@shared/types/Reservation";

interface ReservationState {
  reservations: ReservationWithRelations[];
  upcomingReservations: ReservationWithRelations[];
  selectedReservation: ReservationWithRelations | null;
  tableAvailability: TableAvailability | null;
  isLoading: boolean;
  error: Error | null;

  // Fetch operations
  fetchReservations: () => Promise<void>;
  fetchReservationsByDate: (date: Date) => Promise<void>;
  fetchReservationById: (id: string) => Promise<void>;
  fetchUpcomingReservations: () => Promise<void>;
  getAvailableTimeSlots: (date: Date, tableId?: string) => Promise<void>;

  // Mutation operations
  createReservation: (
    data: CreateReservationDTO,
    userId: string
  ) => Promise<ReservationWithRelations | null>;
  updateReservation: (
    id: string,
    data: UpdateReservationDTO,
    userId: string
  ) => Promise<ReservationWithRelations | null>;
  cancelReservation: (
    id: string,
    userId: string
  ) => Promise<ReservationWithRelations | null>;
  completeReservation: (
    id: string,
    userId: string
  ) => Promise<ReservationWithRelations | null>;

  // UI state
  setSelectedReservation: (
    reservation: ReservationWithRelations | null
  ) => void;
  clearError: () => void;
}

export const useReservationStore = create<ReservationState>((set, get) => ({
  reservations: [],
  upcomingReservations: [],
  selectedReservation: null,
  tableAvailability: null,
  isLoading: false,
  error: null,

  fetchReservations: async () => {
    try {
      set({ isLoading: true });
      const response = await window.electron.getAllReservations();

      if (!response.success || !response.data) {
        throw new Error(response.error || "Failed to fetch reservations");
      }

      set({
        reservations: response.data,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err : new Error(String(err)),
        isLoading: false,
      });
    }
  },

  fetchReservationsByDate: async (date: Date) => {
    try {
      set({ isLoading: true });
      const response = await window.electron.getReservationsByDate(date);

      if (!response.success || !response.data) {
        throw new Error(
          response.error || "Failed to fetch reservations by date"
        );
      }

      set({
        reservations: response.data,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err : new Error(String(err)),
        isLoading: false,
      });
    }
  },

  fetchReservationById: async (id: string) => {
    try {
      set({ isLoading: true });
      const response = await window.electron.getReservationById(id);

      if (!response.success) {
        throw new Error(response.error || "Failed to fetch reservation");
      }

      // Only update selected reservation if found
      if (response.data) {
        set({
          selectedReservation: response.data,
          isLoading: false,
          error: null,
        });
      } else {
        set({
          isLoading: false,
          error: new Error("Reservation not found"),
        });
      }
    } catch (err) {
      set({
        error: err instanceof Error ? err : new Error(String(err)),
        isLoading: false,
      });
    }
  },

  fetchUpcomingReservations: async () => {
    try {
      set({ isLoading: true });
      const response = await window.electron.getUpcomingReservations();

      if (!response.success || !response.data) {
        throw new Error(
          response.error || "Failed to fetch upcoming reservations"
        );
      }

      set({
        upcomingReservations: response.data,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err : new Error(String(err)),
        isLoading: false,
      });
    }
  },

  getAvailableTimeSlots: async (date: Date, tableId?: string) => {
    try {
      set({ isLoading: true });
      const response = await window.electron.getAvailableTimeSlots(
        date,
        tableId
      );

      if (!response.success || !response.data) {
        throw new Error(
          response.error || "Failed to fetch available time slots"
        );
      }

      set({
        tableAvailability: response.data,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err : new Error(String(err)),
        isLoading: false,
      });
    }
  },

  createReservation: async (data: CreateReservationDTO, userId: string) => {
    try {
      set({ isLoading: true });
      const response = await window.electron.createReservation(data, userId);

      if (!response.success || !response.data) {
        throw new Error(response.error || "Failed to create reservation");
      }

      // Refresh reservations and return the created reservation
      await get().fetchReservations();
      await get().fetchUpcomingReservations();

      set({
        isLoading: false,
        error: null,
      });

      return response.data;
    } catch (err) {
      set({
        error: err instanceof Error ? err : new Error(String(err)),
        isLoading: false,
      });
      return null;
    }
  },

  updateReservation: async (
    id: string,
    data: UpdateReservationDTO,
    userId: string
  ) => {
    try {
      set({ isLoading: true });
      const response = await window.electron.updateReservation(
        id,
        data,
        userId
      );

      if (!response.success || !response.data) {
        throw new Error(response.error || "Failed to update reservation");
      }

      // Update the local state with updated reservation
      set((state) => ({
        reservations: state.reservations.map((res) =>
          res.id === id ? response.data! : res
        ),
        upcomingReservations: state.upcomingReservations.map((res) =>
          res.id === id ? response.data! : res
        ),
        selectedReservation:
          state.selectedReservation?.id === id
            ? response.data
            : state.selectedReservation,
        isLoading: false,
        error: null,
      }));

      return response.data;
    } catch (err) {
      set({
        error: err instanceof Error ? err : new Error(String(err)),
        isLoading: false,
      });
      return null;
    }
  },

  cancelReservation: async (id: string, userId: string) => {
    try {
      set({ isLoading: true });
      const response = await window.electron.cancelReservation(id, userId);

      if (!response.success || !response.data) {
        throw new Error(response.error || "Failed to cancel reservation");
      }

      // Update local state
      set((state) => ({
        reservations: state.reservations.map((res) =>
          res.id === id ? { ...res, status: ReservationStatus.CANCELLED } : res
        ),
        upcomingReservations: state.upcomingReservations.filter(
          (res) => res.id !== id
        ),
        selectedReservation:
          state.selectedReservation?.id === id
            ? {
                ...state.selectedReservation,
                status: ReservationStatus.CANCELLED,
              }
            : state.selectedReservation,
        isLoading: false,
        error: null,
      }));

      return response.data;
    } catch (err) {
      set({
        error: err instanceof Error ? err : new Error(String(err)),
        isLoading: false,
      });
      return null;
    }
  },

  completeReservation: async (id: string, userId: string) => {
    try {
      set({ isLoading: true });
      const response = await window.electron.completeReservation(id, userId);

      if (!response.success || !response.data) {
        throw new Error(response.error || "Failed to complete reservation");
      }

      // Update local state
      set((state) => ({
        reservations: state.reservations.map((res) =>
          res.id === id ? { ...res, status: ReservationStatus.COMPLETED } : res
        ),
        upcomingReservations: state.upcomingReservations.filter(
          (res) => res.id !== id
        ),
        selectedReservation:
          state.selectedReservation?.id === id
            ? {
                ...state.selectedReservation,
                status: ReservationStatus.COMPLETED,
              }
            : state.selectedReservation,
        isLoading: false,
        error: null,
      }));

      return response.data;
    } catch (err) {
      set({
        error: err instanceof Error ? err : new Error(String(err)),
        isLoading: false,
      });
      return null;
    }
  },

  setSelectedReservation: (reservation: ReservationWithRelations | null) => {
    set({ selectedReservation: reservation });
  },

  clearError: () => {
    set({ error: null });
  },
}));
