import {
  PrismaClient,
  TableStatus,
  SessionType,
  SessionStatus,
} from "@prisma/client";
import { BaseService } from "./BaseService";
import { CreateTableDTO, UpdateTableDTO } from "@/shared/types/Table";

const TRANSACTION_OPTIONS = {
  timeout: 10000,
  maxWait: 15000,
};

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
    try {
      const table = await this.prisma.poolTable.create({
        data: {
          number: data.number,
          status: TableStatus.AVAILABLE,
        },
        include: {
          sessions: true,
        },
      });

      await this.broadcastEvent("TABLE_CREATED", table);
      return table;
    } catch (error) {
      console.error("Error creating table:", error);
      throw error;
    }
  }

  async openTable(
    tableId: string,
    userId: string,
    sessionType: SessionType,
    duration?: number
  ) {
    try {
      // Check table availability first
      const existingTable = await this.prisma.poolTable.findUnique({
        where: { id: tableId },
      });

      if (!existingTable || existingTable.status !== TableStatus.AVAILABLE) {
        throw new Error("Table is not available");
      }

      // Update table and create session in one operation
      const table = await this.prisma.poolTable.update({
        where: { id: tableId },
        data: {
          status: TableStatus.IN_USE,
          sessions: {
            create: {
              userId,
              type: sessionType,
              duration,
              status: SessionStatus.ACTIVE,
            },
          },
        },
        include: {
          sessions: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      });

      // Handle non-critical operations separately
      await Promise.all([
        this.logActivity(
          userId,
          "TABLE_OPENED",
          `Table ${table.number} opened`
        ),
        this.broadcastEvent("TABLE_UPDATED", table),
      ]).catch((error) => {
        console.error("Non-critical operations error:", error);
      });

      return table;
    } catch (error) {
      console.error("Error opening table:", error);
      throw error;
    }
  }

  async closeTable(tableId: string, userId: string) {
    try {
      // Find active session first
      const activeSession = await this.prisma.session.findFirst({
        where: {
          tableId,
          status: SessionStatus.ACTIVE,
        },
      });

      if (!activeSession) {
        throw new Error("No active session found for this table");
      }

      const duration = Math.ceil(
        (Date.now() - activeSession.startTime.getTime()) / (1000 * 60)
      );
      const cost = this.calculateSessionCost(duration, activeSession.type);

      // Update both table and session in one operation
      const table = await this.prisma.poolTable.update({
        where: { id: tableId },
        data: {
          status: TableStatus.AVAILABLE,
          sessions: {
            update: {
              where: { id: activeSession.id },
              data: {
                endTime: new Date(),
                status: SessionStatus.COMPLETED,
                cost,
              },
            },
          },
        },
        include: {
          sessions: {
            where: { id: activeSession.id },
          },
        },
      });

      // Handle non-critical operations separately
      await Promise.all([
        this.logActivity(
          userId,
          "TABLE_CLOSED",
          `Table ${table.number} closed`
        ),
        this.broadcastEvent("TABLE_UPDATED", table),
      ]).catch((error) => {
        console.error("Non-critical operations error:", error);
      });

      return table;
    } catch (error) {
      console.error("Error closing table:", error);
      throw error;
    }
  }

  async updateTable(tableId: string, userId: string, data: UpdateTableDTO) {
    try {
      const table = await this.prisma.poolTable.update({
        where: { id: tableId },
        data,
        include: {
          sessions: true,
        },
      });

      await Promise.all([
        this.logActivity(
          userId,
          "TABLE_UPDATED",
          `Table ${table.number} updated`
        ),
        this.broadcastEvent("TABLE_UPDATED", table),
      ]).catch((error) => {
        console.error("Non-critical operations error:", error);
      });

      return table;
    } catch (error) {
      console.error("Error updating table:", error);
      throw error;
    }
  }

  async setTableMaintenance(tableId: string, userId: string) {
    try {
      const table = await this.prisma.poolTable.update({
        where: { id: tableId },
        data: { status: TableStatus.MAINTENANCE },
        include: {
          sessions: true,
        },
      });

      await Promise.all([
        this.logActivity(
          userId,
          "TABLE_MAINTENANCE",
          `Table ${table.number} set to maintenance`
        ),
        this.broadcastEvent("TABLE_UPDATED", table),
      ]).catch((error) => {
        console.error("Non-critical operations error:", error);
      });

      return table;
    } catch (error) {
      console.error("Error setting table maintenance:", error);
      throw error;
    }
  }

  async getActiveSessions() {
    try {
      return await this.prisma.session.findMany({
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
    } catch (error) {
      console.error("Error getting active sessions:", error);
      throw error;
    }
  }

  async getTableSessions(tableId: string) {
    try {
      return await this.prisma.session.findMany({
        where: {
          tableId,
          OR: [
            { status: SessionStatus.ACTIVE },
            {
              AND: [
                { status: SessionStatus.COMPLETED },
                {
                  endTime: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
                },
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
    } catch (error) {
      console.error("Error getting table sessions:", error);
      throw error;
    }
  }

  private calculateSessionCost(duration: number, type: SessionType): number {
    const HOURLY_RATE = 30;
    const MINUTE_RATE = HOURLY_RATE / 60;

    if (type === SessionType.TIMED) {
      return Math.ceil(duration * MINUTE_RATE);
    } else {
      return Math.max(Math.ceil(duration * MINUTE_RATE), HOURLY_RATE);
    }
  }
}
