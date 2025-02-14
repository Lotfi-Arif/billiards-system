import { ApiResponse, DailyPrayerTimes, PrayerTime } from "./api";
import { CreatePaymentDTO, Payment } from "./Payment";
import { CreateReservationDTO, Reservation } from "./Reservation";
import { CreateSessionDTO, EndSessionDTO, Session } from "./Session";
import { Table, TableStatus, UpdateTableDTO } from "./Table";
import { User, CreateUserDTO } from "./User";

export interface ElectronAPI {
  // Table operations
  getTables: () => Promise<ApiResponse<Table[]>>;

  getTable: (id: number) => Promise<ApiResponse<Table>>;

  updateTableStatus: (
    id: number,
    data: UpdateTableDTO,
    performedBy?: number
  ) => Promise<ApiResponse<Table>>;

  openTable: (id: number, performedBy?: number) => Promise<ApiResponse<Table>>;

  closeTable: (id: number, performedBy?: number) => Promise<ApiResponse<Table>>;

  setTableMaintenance: (
    id: number,
    performedBy?: number
  ) => Promise<ApiResponse<Table>>;

  setTableCooldown: (
    id: number,
    performedBy?: number
  ) => Promise<ApiResponse<Table>>;

  isTableAvailable: (id: number) => Promise<ApiResponse<boolean>>;
}
