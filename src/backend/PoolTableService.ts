import {
  PrismaClient,
  TableStatus,
  SessionType,
  SessionStatus,
} from "@prisma/client";
import { BaseService } from "./BaseService";
import { CreateTableDTO, UpdateTableDTO } from "@/shared/types/Table";

export class PoolTableService extends BaseService {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  async getAllTables() {
    return this.prisma.poolTable.findMany({
      include: {
        sessions: {
          where: {
            OR: [
              { status: SessionStatus.ACTIVE },
              {
                AND: [
                  { status: SessionStatus.COMPLETED },
                  {
                    endTime: {
                      gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
                    },
                  },
                ],
              },
            ],
          },
        },
      },
    });
  }

  async getTableStatus(tableId: string) {
    return this.prisma.poolTable.findUnique({
      where: { id: tableId },
      include: {
        sessions: {
          where: { status: SessionStatus.ACTIVE },
        },
      },
    });
  }

  async createTable(data: CreateTableDTO) {
    const table = await this.prisma.poolTable.create({
      data: {
        number: data.number,
        status: TableStatus.AVAILABLE,
      },
      include: {
        sessions: true,
      },
    });

    this.broadcastEvent("TABLE_CREATED", table);
    return table;
  }

  async openTable(
    tableId: string,
    userId: string,
    sessionType: SessionType,
    duration?: number
  ) {
    // Start a transaction
    return this.prisma.$transaction(async (tx) => {
      // Update table status
      const table = await tx.poolTable.update({
        where: { id: tableId },
        data: { status: TableStatus.IN_USE },
        include: { sessions: true },
      });

      // Create new session
      const session = await tx.session.create({
        data: {
          tableId,
          userId,
          type: sessionType,
          duration,
          status: SessionStatus.ACTIVE,
        },
      });

      await this.logActivity(
        userId,
        "TABLE_OPENED",
        `Table ${table.number} opened`
      );
      this.broadcastEvent("TABLE_UPDATED", table);

      return table;
    });
  }

  async closeTable(tableId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      // Find active session
      const activeSession = await tx.session.findFirst({
        where: {
          tableId,
          status: SessionStatus.ACTIVE,
        },
      });

      if (!activeSession) {
        throw new Error("No active session found for this table");
      }

      // Calculate cost based on duration
      const duration = Math.ceil(
        (Date.now() - activeSession.startTime.getTime()) / (1000 * 60)
      );
      const cost = this.calculateSessionCost(duration, activeSession.type);

      // Update session
      await tx.session.update({
        where: { id: activeSession.id },
        data: {
          endTime: new Date(),
          status: SessionStatus.COMPLETED,
          cost,
        },
      });

      // Update table status
      const table = await tx.poolTable.update({
        where: { id: tableId },
        data: { status: TableStatus.AVAILABLE },
        include: { sessions: true },
      });

      await this.logActivity(
        userId,
        "TABLE_CLOSED",
        `Table ${table.number} closed`
      );
      this.broadcastEvent("TABLE_UPDATED", table);

      return table;
    });
  }

  async updateTable(tableId: string, userId: string, data: UpdateTableDTO) {
    const table = await this.prisma.poolTable.update({
      where: { id: tableId },
      data,
      include: { sessions: true },
    });

    await this.logActivity(
      userId,
      "TABLE_UPDATED",
      `Table ${table.number} updated`
    );
    this.broadcastEvent("TABLE_UPDATED", table);

    return table;
  }

  async setTableMaintenance(tableId: string, userId: string) {
    const table = await this.prisma.poolTable.update({
      where: { id: tableId },
      data: { status: TableStatus.MAINTENANCE },
      include: { sessions: true },
    });

    await this.logActivity(
      userId,
      "TABLE_MAINTENANCE",
      `Table ${table.number} set to maintenance`
    );
    this.broadcastEvent("TABLE_UPDATED", table);

    return table;
  }

  async getActiveSessions() {
    return this.prisma.session.findMany({
      where: {
        status: SessionStatus.ACTIVE,
      },
      include: {
        table: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async getTableSessions(tableId: string) {
    return this.prisma.session.findMany({
      where: {
        tableId,
        OR: [
          { status: SessionStatus.ACTIVE },
          {
            AND: [
              { status: SessionStatus.COMPLETED },
              { endTime: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
            ],
          },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async reserveTable(tableId: string, userId: string, duration: number) {
    return this.prisma.$transaction(async (tx) => {
      // Check if table is available
      const table = await tx.poolTable.findUnique({
        where: { id: tableId },
      });

      if (!table || table.status !== TableStatus.AVAILABLE) {
        throw new Error("Table is not available for reservation");
      }

      // Create reservation
      await tx.reservation.create({
        data: {
          tableId,
          userId,
          duration,
          startTime: new Date(),
          status: "CONFIRMED",
        },
      });

      // Update table status
      const updatedTable = await tx.poolTable.update({
        where: { id: tableId },
        data: { status: TableStatus.RESERVED },
        include: { sessions: true },
      });

      await this.logActivity(
        userId,
        "TABLE_RESERVED",
        `Table ${table.number} reserved`
      );
      this.broadcastEvent("TABLE_UPDATED", updatedTable);

      return updatedTable;
    });
  }

  private calculateSessionCost(duration: number, type: SessionType): number {
    // Implement your cost calculation logic here
    const HOURLY_RATE = 30; // $30 per hour
    const MINUTE_RATE = HOURLY_RATE / 60;

    if (type === SessionType.TIMED) {
      return Math.ceil(duration * MINUTE_RATE);
    } else {
      // For open sessions, maybe apply a different rate or minimum
      return Math.max(Math.ceil(duration * MINUTE_RATE), HOURLY_RATE);
    }
  }
}
