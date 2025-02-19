import { PoolTable, TableStatus, SessionType } from "@prisma/client";
import { ApiResponse } from "./api";
import { AuthResponse } from "./User";

export interface ElectronAPI {
  // User operations
  login(credentials: {
    email: string;
    password: string;
  }): Promise<ApiResponse<AuthResponse>>;
  logout(): Promise<ApiResponse<void>>;
  getCurrentUser(): Promise<ApiResponse<any>>;

  // Table operations
  getTables(): Promise<ApiResponse<PoolTable[]>>;
  getTableStatus(tableId: string): Promise<ApiResponse<PoolTable>>;
  createTable(number: number): Promise<ApiResponse<PoolTable>>;
  openTable(
    tableId: string,
    userId: string,
    sessionType: SessionType,
    duration?: number
  ): Promise<ApiResponse<PoolTable>>;
  closeTable(tableId: string, userId: string): Promise<ApiResponse<PoolTable>>;
  updateTable(
    tableId: string,
    userId: string,
    data: { status?: TableStatus; isLightOn?: boolean }
  ): Promise<ApiResponse<PoolTable>>;
  setTableMaintenance(
    tableId: string,
    userId: string
  ): Promise<ApiResponse<PoolTable>>;
}
