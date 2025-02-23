import { TableStatus, SessionType, Session } from "@prisma/client";
import { TableWithSessions } from "./Table";
import { AuthResponse, CurrentUserResponse } from "./User";

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
  logout(): Promise<ApiResponse<void>>;
  getCurrentUser(): Promise<ApiResponse<CurrentUserResponse>>;

  // Table operations
  getTables(): Promise<ApiResponse<TableWithSessions[]>>;
  getTableStatus(tableId: string): Promise<ApiResponse<TableWithSessions>>;
  createTable(number: number): Promise<ApiResponse<TableWithSessions>>;
  openTable(
    tableId: string,
    userId: string,
    sessionType: SessionType,
    duration?: number
  ): Promise<ApiResponse<TableWithSessions>>;
  closeTable(
    tableId: string,
    userId: string
  ): Promise<ApiResponse<TableWithSessions>>;
  updateTable(
    tableId: string,
    userId: string,
    data: { status?: TableStatus; isLightOn?: boolean }
  ): Promise<ApiResponse<TableWithSessions>>;
  setTableMaintenance(
    tableId: string,
    userId: string
  ): Promise<ApiResponse<TableWithSessions>>;

  // Session operations
  getActiveSessions(): Promise<ApiResponse<Session[]>>;
  getTableSessions(tableId: string): Promise<ApiResponse<Session[]>>;

  // Reservation operations
  reserveTable(
    tableId: string,
    userId: string,
    duration: number
  ): Promise<ApiResponse<TableWithSessions>>;
}
