import { TableStatus } from "@prisma/client";

export interface CreateTableDTO {
  number: number;
  hourlyRate?: number;
}

export interface UpdateTableDTO {
  hourlyRate?: number;
  status?: TableStatus;
}
