export enum TableStatus {
  AVAILABLE = "AVAILABLE",
  IN_USE = "IN_USE",
  MAINTENANCE = "MAINTENANCE",
  PRAYER_COOLDOWN = "PRAYER_COOLDOWN",
  RESERVED = "RESERVED",
  OFF = "OFF",
}

export interface Table {
  id: number;
  tableNumber: number;
  status: TableStatus;
  currentSession?: {
    startTime: Date;
    openedBy: number; // Staff ID
    customerId?: number;
  };
  lastMaintenance: Date | null;
  condition: string;
  hourlyRate: number;
  isActive: boolean;
  lightState: boolean;
  prayerCooldownEnd?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTableDTO {
  tableNumber: number;
  hourlyRate: number;
  condition?: string;
}

export interface UpdateTableDTO {
  status?: TableStatus;
  condition?: string;
  hourlyRate?: number;
  lastMaintenance?: Date;
  isActive?: boolean;
  lightState?: boolean;
  prayerCooldownEnd?: Date;
}

export interface TableSession {
  id: number;
  tableId: number;
  startTime: Date;
  endTime?: Date;
  staffId: number;
  customerId?: number;
  totalAmount?: number;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
}
