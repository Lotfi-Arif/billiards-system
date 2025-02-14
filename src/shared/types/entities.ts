export type UserRole = "manager" | "staff" | "customer";

export interface User {
  id: number;
  username: string;
  role: UserRole;
  createdAt: Date;
}

export interface PoolTable {
  id: number;
  status: "available" | "occupied" | "maintenance";
  staffName?: string;
  currentSessionId?: number;
  lastMaintained: Date;
  sessionStartTime?: Date;
}

export interface Session {
  id: number;
  tableId: number;
  staffId: number;
  staffName?: string;
  customerId?: number;
  customerName?: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  amount?: number;
  status: "active" | "completed" | "cancelled";
}

export interface Reservation {
  id: number;
  tableId: number;
  customerId: number;
  customerName?: string;
  staffId: number;
  staffName?: string;
  reservationTime: Date;
  status: "pending" | "confirmed" | "cancelled";
}
