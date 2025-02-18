import { PoolTable, SessionType, TableStatus } from "@prisma/client";

export interface CreateTableDTO {
  number: number;
  hourlyRate?: number;
}

export interface UpdateTableDTO {
  hourlyRate?: number;
  status?: TableStatus;
}

export interface TableWithSessions extends PoolTable {
  sessions: {
    id: string;
    startTime: Date;
    endTime?: Date | null;
    type: SessionType;
    duration?: number | null;
  }[];
}
