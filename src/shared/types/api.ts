// src/shared/types/api.ts

import { Table, TableStatus } from "./Table";

// Reservation Types
export interface Reservation {
  id: number;
  tableId: number;
  customerId?: number;
  startTime: Date;
  endTime: Date;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateReservationDTO {
  tableId: number;
  customerId?: number;
  startTime: Date;
  endTime: Date;
  notes?: string;
}

// Session Types
export interface Session {
  id: number;
  tableId: number;
  customerId?: number;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  cost?: number;
  status: "active" | "completed" | "cancelled";
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSessionDTO {
  tableId: number;
  customerId?: number;
  startTime: Date;
  notes?: string;
}

export interface EndSessionDTO {
  endTime: Date;
  duration: number;
  cost: number;
  notes?: string;
}

// User Types
export interface User {
  id: number;
  username: string;
  email: string;
  role: "admin" | "staff" | "customer";
  status: "active" | "inactive";
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserDTO {
  username: string;
  email: string;
  password: string;
  role: "admin" | "staff" | "customer";
}

// Prayer Types
export interface PrayerTime {
  name: string;
  time: Date;
  isJamaah: boolean;
}

export interface DailyPrayerTimes {
  date: string;
  prayers: {
    fajr: PrayerTime;
    dhuhr: PrayerTime;
    asr: PrayerTime;
    maghrib: PrayerTime;
    isha: PrayerTime;
  };
}

// Payment Types
export interface Payment {
  id: number;
  sessionId: number;
  amount: number;
  method: "cash" | "card" | "mobile";
  status: "pending" | "completed" | "failed" | "refunded";
  transactionId?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePaymentDTO {
  sessionId: number;
  amount: number;
  method: "cash" | "card" | "mobile";
  transactionId?: string;
  notes?: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Updated ElectronAPI interface with proper types
export interface ElectronAPI {
  // Reservation operations
  createReservation: (
    data: CreateReservationDTO
  ) => Promise<ApiResponse<Reservation>>;
  cancelReservation: (id: number) => Promise<ApiResponse<Reservation>>;

  // Session operations
  startSession: (data: CreateSessionDTO) => Promise<ApiResponse<Session>>;
  endSession: (
    id: number,
    data: EndSessionDTO
  ) => Promise<ApiResponse<Session>>;

  // User operations
  authenticateUser: (
    username: string,
    password: string
  ) => Promise<ApiResponse<{ token: string; user: User }>>;
  createUser: (userData: CreateUserDTO) => Promise<ApiResponse<User>>;

  // Prayer operations
  getPrayerTimes: (dateStr: string) => Promise<ApiResponse<DailyPrayerTimes>>;
  getNextPrayer: (dateStr: string) => Promise<ApiResponse<PrayerTime>>;

  // Table operations
  getTables: () => Promise<ApiResponse<Table[]>>;

  // Payment operations
  createPayment: (data: CreatePaymentDTO) => Promise<ApiResponse<Payment>>;
}
