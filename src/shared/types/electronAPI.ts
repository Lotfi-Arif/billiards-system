import { TableStatus, SessionType, SessionStatus } from "@prisma/client";
import { TableWithSessions } from "./Table";
import { AuthResponse, CurrentUserResponse } from "./User";

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
  toggleMaintenance(
    tableId: string,
    userId: string
  ): Promise<ApiResponse<TableWithSessions>>;

  // Session operations
  getActiveSessions(): Promise<ApiResponse<SessionData[]>>;
  getTableSessions(tableId: string): Promise<ApiResponse<SessionData[]>>;

  // Reservation operations
  reserveTable(
    tableId: string,
    userId: string,
    duration: number
  ): Promise<ApiResponse<TableWithSessions>>;

  // WebSocket events
  onTableUpdate(callback: (data: TableWithSessions) => void): () => void;
  onSessionUpdate(callback: (data: SessionData) => void): () => void;
}
