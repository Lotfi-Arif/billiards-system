import { TableStatus, SessionType, SessionStatus } from "@prisma/client";
import { TableWithSessions } from "./Table";
import { AuthResponse, CurrentUserResponse } from "./User";
import {
  CreateReservationDTO,
  ReservationWithRelations,
  TableAvailability,
  UpdateReservationDTO,
} from "./Reservation";

export interface SessionData {
  id: string;
  status: SessionStatus;
  createdAt: Date;
  updatedAt: Date;
  tableId: string;
  userId: string;
  startTime: Date;
  endTime: Date | null;
  type: SessionType;
  duration: number | null;
  cost: number | null;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ElectronAPI {
  // User operations
  login(credentials: {
    email: string;
    password: string;
  }): Promise<ApiResponse<AuthResponse>>;
  logout(userId: string): Promise<ApiResponse<void>>;
  getCurrentUser(userId: string): Promise<ApiResponse<CurrentUserResponse>>;

  // Table operations
  getTables(): Promise<ApiResponse<TableWithSessions[]>>;
  getTableStatus(tableId: string): Promise<ApiResponse<TableWithSessions>>;
  createTable(number: number): Promise<ApiResponse<TableWithSessions>>;
  openTable(
    tableId: string,
    userId: string,
    sessionType: SessionType,
    duration?: number,
  ): Promise<ApiResponse<TableWithSessions>>;
  closeTable(
    tableId: string,
    userId: string,
  ): Promise<ApiResponse<TableWithSessions>>;
  updateTable(
    tableId: string,
    userId: string,
    data: { status?: TableStatus; isLightOn?: boolean },
  ): Promise<ApiResponse<TableWithSessions>>;
  setTableMaintenance(
    tableId: string,
    userId: string,
  ): Promise<ApiResponse<TableWithSessions>>;

  // Session operations
  getActiveSessions(): Promise<ApiResponse<SessionData[]>>;
  getTableSessions(tableId: string): Promise<ApiResponse<SessionData[]>>;

  // Reservation operations
  getAllReservations(): Promise<ApiResponse<ReservationWithRelations[]>>;
  getReservationsByDate(
    date: Date,
  ): Promise<ApiResponse<ReservationWithRelations[]>>;
  getReservationById(
    id: string,
  ): Promise<ApiResponse<ReservationWithRelations | null>>;
  createReservation(
    data: CreateReservationDTO,
    staffUserId: string,
  ): Promise<ApiResponse<ReservationWithRelations>>;
  updateReservation(
    id: string,
    data: UpdateReservationDTO,
    userId: string,
  ): Promise<ApiResponse<ReservationWithRelations>>;
  cancelReservation(
    id: string,
    userId: string,
  ): Promise<ApiResponse<ReservationWithRelations>>;
  completeReservation(
    id: string,
    userId: string,
  ): Promise<ApiResponse<ReservationWithRelations>>;
  getAvailableTimeSlots(
    date: Date,
    tableId?: string,
  ): Promise<ApiResponse<TableAvailability>>;
  getUpcomingReservations(): Promise<ApiResponse<ReservationWithRelations[]>>;

  // WebSocket events
  onTableUpdate(callback: (data: TableWithSessions) => void): () => void;
  onSessionUpdate(callback: (data: SessionData) => void): () => void;
}
