export interface Session {
  id: number;
  tableId: number;
  customerId: number | null; // null for walk-in customers
  startTime: Date;
  endTime: Date | null;
  duration: number | null; // in minutes
  cost: number | null;
  status: SessionStatus;
  createdAt: Date;
  updatedAt: Date;
}

export enum SessionStatus {
  ACTIVE = "ACTIVE",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export interface CreateSessionDTO {
  tableId: number;
  customerId?: number;
  startTime?: Date; // optional, defaults to now
}

export interface EndSessionDTO {
  endTime?: Date; // optional, defaults to now
  status?: SessionStatus;
}
