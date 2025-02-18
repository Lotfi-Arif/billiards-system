import { PoolTable, SessionType, TableStatus } from "@prisma/client";

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Updated ElectronAPI interface with proper types
export interface ElectronAPI {
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
