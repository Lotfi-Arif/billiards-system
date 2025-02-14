export interface Reservation {
  id: number;
  tableId: number;
  customerId: number;
  startTime: Date;
  endTime: Date;
  status: ReservationStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum ReservationStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  CANCELLED = "CANCELLED",
  COMPLETED = "COMPLETED",
  NO_SHOW = "NO_SHOW",
}

export interface CreateReservationDTO {
  tableId: number;
  customerId: number;
  startTime: Date;
  endTime: Date;
  notes?: string;
}

export interface UpdateReservationDTO {
  status?: ReservationStatus;
  notes?: string;
}
