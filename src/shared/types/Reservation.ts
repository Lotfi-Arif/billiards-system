import {
  PoolTable,
  Reservation,
  ReservationStatus,
  User,
} from "@prisma/client";

export type ReservationWithRelations = Reservation & {
  table: PoolTable;
  user: Pick<User, "id" | "name" | "email">;
};

export interface CreateReservationDTO {
  tableId: string;
  userId: string;
  startTime: Date;
  duration: number; // in minutes
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  numberOfPeople?: number;
  notes?: string;
}

export interface TableSlots {
  tableNumber: number;
  slots: Record<string, boolean>;
}

export interface UpdateReservationDTO {
  status?: ReservationStatus;
  startTime?: Date;
  duration?: number;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  numberOfPeople?: number;
  notes?: string;
}

export interface TableAvailability {
  [tableId: string]: TableSlots;
}
