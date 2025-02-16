import { PrismaClient, TableStatus, PoolTable } from "@prisma/client";
import { Server } from "ws";
import { BaseService } from "./BaseService";
import * as mqtt from "mqtt";

export class PoolTableControlService extends BaseService {
  private mqttClient: mqtt.MqttClient;

  constructor(prisma: PrismaClient, wss: Server, mqttBroker: string) {
    super(prisma, wss);
    this.mqttClient = mqtt.connect(mqttBroker);
    this.setupMqttHandlers();
  }

  private setupMqttHandlers() {
    this.mqttClient.on("connect", () => {
      console.log("Connected to MQTT broker");
      this.mqttClient.subscribe("tables/+/status");
    });

    this.mqttClient.on("message", async (topic, message) => {
      const tableNumber = topic.split("/")[1];
      const status = message.toString();
      await this.updateTableStatus(
        parseInt(tableNumber),
        status as TableStatus
      );
    });
  }

  async getAllTables(): Promise<PoolTable[]> {
    return this.prisma.poolTable.findMany({
      include: {
        sessions: {
          where: {
            status: "ACTIVE",
          },
        },
        reservations: {
          where: {
            status: "CONFIRMED",
          },
        },
      },
    });
  }

  async toggleTableLight(tableId: string, userId: string): Promise<PoolTable> {
    const table = await this.prisma.poolTable.findUnique({
      where: { id: tableId },
    });

    if (!table) {
      throw new Error("Table not found");
    }

    const updatedTable = await this.prisma.poolTable.update({
      where: { id: tableId },
      data: { isLightOn: !table.isLightOn },
    });

    // Send command to Arduino via MQTT
    this.mqttClient.publish(
      `tables/${table.number}/light`,
      updatedTable.isLightOn ? "ON" : "OFF"
    );

    await this.logActivity(
      userId,
      "TOGGLE_LIGHT",
      `Table ${table.number} light turned ${
        updatedTable.isLightOn ? "on" : "off"
      }`
    );

    this.broadcastEvent("TABLE_UPDATED", updatedTable);
    return updatedTable;
  }

  async updateTableStatus(
    tableNumber: number,
    status: TableStatus
  ): Promise<PoolTable> {
    const updatedTable = await this.prisma.poolTable.update({
      where: { number: tableNumber },
      data: { status },
    });

    this.broadcastEvent("TABLE_UPDATED", updatedTable);
    return updatedTable;
  }

  async setPrayerTimeStatus(duration: number): Promise<void> {
    await this.prisma.poolTable.updateMany({
      where: {
        status: "IN_USE",
      },
      data: {
        status: "PRAYER_TIME",
      },
    });

    // Turn off all lights during prayer time
    const tables = await this.getAllTables();
    for (const table of tables) {
      this.mqttClient.publish(`tables/${table.number}/light`, "OFF");
    }

    this.broadcastEvent("PRAYER_TIME_START", { duration });

    // Schedule end of prayer time
    setTimeout(async () => {
      await this.prisma.poolTable.updateMany({
        where: {
          status: "PRAYER_TIME",
        },
        data: {
          status: "AVAILABLE",
        },
      });

      this.broadcastEvent("PRAYER_TIME_END", null);
    }, duration * 60 * 1000);
  }
}
