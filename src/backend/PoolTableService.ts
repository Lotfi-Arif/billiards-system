import { PrismaClient, PoolTable, TableStatus } from "@prisma/client";
import { BaseService } from "./BaseService";
import { ArduinoControlService } from "./ArduinoControlService";
import { CreateTableDTO, UpdateTableDTO } from "@/shared/types/Table";

export class PoolTableService extends BaseService {
  private arduinoService: ArduinoControlService;

  constructor(prisma: PrismaClient, arduinoService: ArduinoControlService) {
    super(prisma);
    this.arduinoService = arduinoService;
  }

  async createTable(data: CreateTableDTO): Promise<PoolTable> {
    const existingTable = await this.prisma.poolTable.findUnique({
      where: { number: data.number },
    });

    if (existingTable) {
      throw new Error(`Table number ${data.number} already exists`);
    }

    return this.prisma.poolTable.create({
      data: {
        number: data.number,
        status: TableStatus.AVAILABLE,
        isLightOn: false,
      },
    });
  }

  async openTable(
    tableId: string,
    userId: string,
    sessionType: "TIMED" | "OPEN",
    duration?: number
  ): Promise<PoolTable> {
    const table = await this.prisma.poolTable.findUnique({
      where: { id: tableId },
    });

    if (!table) {
      throw new Error("Table not found");
    }

    if (table.status !== TableStatus.AVAILABLE) {
      throw new Error("Table is not available");
    }

    // Start a new session
    await this.prisma.session.create({
      data: {
        tableId,
        userId,
        type: sessionType,
        duration,
        status: "ACTIVE",
      },
    });

    // Update table status and turn on light
    const updatedTable = await this.prisma.poolTable.update({
      where: { id: tableId },
      data: {
        status: TableStatus.IN_USE,
        isLightOn: true,
      },
    });

    // Use Arduino service to control physical table
    await this.arduinoService.setTableLight(table.number, true);

    await this.logActivity(
      userId,
      "TABLE_OPENED",
      `Table ${table.number} opened for ${sessionType} session`
    );

    return updatedTable;
  }

  async closeTable(tableId: string, userId: string): Promise<PoolTable> {
    const table = await this.prisma.poolTable.findUnique({
      where: { id: tableId },
      include: {
        sessions: {
          where: { status: "ACTIVE" },
        },
      },
    });

    if (!table) {
      throw new Error("Table not found");
    }

    if (table.status !== TableStatus.IN_USE) {
      throw new Error("Table is not in use");
    }

    // Close active session
    if (table.sessions[0]) {
      await this.prisma.session.update({
        where: { id: table.sessions[0].id },
        data: {
          status: "COMPLETED",
          endTime: new Date(),
        },
      });
    }

    // Update table status and turn off light
    const updatedTable = await this.prisma.poolTable.update({
      where: { id: tableId },
      data: {
        status: TableStatus.AVAILABLE,
        isLightOn: false,
      },
    });

    // Use Arduino service to control physical table
    await this.arduinoService.setTableLight(table.number, false);

    await this.logActivity(
      userId,
      "TABLE_CLOSED",
      `Table ${table.number} closed`
    );

    return updatedTable;
  }

  async updateTable(
    tableId: string,
    userId: string,
    data: UpdateTableDTO
  ): Promise<PoolTable> {
    const table = await this.prisma.poolTable.findUnique({
      where: { id: tableId },
    });

    if (!table) {
      throw new Error("Table not found");
    }

    // If we're changing status to IN_USE, check if there's an active session
    if (data.status === TableStatus.IN_USE) {
      const activeSession = await this.prisma.session.findFirst({
        where: {
          tableId,
          status: "ACTIVE",
        },
      });

      if (!activeSession) {
        throw new Error("Cannot set table to IN_USE without an active session");
      }
    }

    const updatedTable = await this.prisma.poolTable.update({
      where: { id: tableId },
      data,
    });

    // If status is changing, handle light control
    if (data.status && data.status !== table.status) {
      const shouldLightBeOn = data.status === TableStatus.IN_USE;
      await this.arduinoService.setTableLight(table.number, shouldLightBeOn);
    }

    await this.logActivity(
      userId,
      "TABLE_UPDATED",
      `Table ${table.number} updated: ${JSON.stringify(data)}`
    );

    return updatedTable;
  }

  async setTableMaintenance(
    tableId: string,
    userId: string
  ): Promise<PoolTable> {
    const table = await this.prisma.poolTable.findUnique({
      where: { id: tableId },
    });

    if (!table) {
      throw new Error("Table not found");
    }

    const updatedTable = await this.prisma.poolTable.update({
      where: { id: tableId },
      data: {
        status: TableStatus.MAINTENANCE,
        isLightOn: false,
      },
    });

    // Use Arduino service to control physical table
    await this.arduinoService.setTableLight(table.number, false);

    await this.logActivity(
      userId,
      "TABLE_MAINTENANCE",
      `Table ${table.number} set to maintenance`
    );

    return updatedTable;
  }

  async getAllTables(): Promise<PoolTable[]> {
    return this.prisma.poolTable.findMany({
      include: {
        sessions: {
          where: { status: "ACTIVE" },
        },
        reservations: {
          where: {
            status: "CONFIRMED",
            startTime: {
              gte: new Date(),
            },
          },
        },
      },
      orderBy: { number: "asc" },
    });
  }

  async getTableStatus(tableId: string): Promise<PoolTable> {
    const table = await this.prisma.poolTable.findUnique({
      where: { id: tableId },
      include: {
        sessions: {
          where: { status: "ACTIVE" },
        },
      },
    });

    if (!table) {
      throw new Error("Table not found");
    }

    return table;
  }
}
