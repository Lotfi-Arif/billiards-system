import { PrismaClient } from "@prisma/client";
import { Server } from "ws";
import { BaseService } from "./BaseService";
import * as mqtt from "mqtt";

export class ArduinoControlService extends BaseService {
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

    this.mqttClient.on("message", (topic, message) => {
      console.log(`Received message on ${topic}: ${message.toString()}`);
    });
  }

  async setTableLight(tableNumber: number, isOn: boolean): Promise<void> {
    this.mqttClient.publish(`tables/${tableNumber}/light`, isOn ? "ON" : "OFF");
  }

  async getTableHardwareStatus(tableNumber: number): Promise<boolean> {
    return new Promise((resolve) => {
      this.mqttClient.publish(`tables/${tableNumber}/ping`, "", { qos: 1 });

      const timeout = setTimeout(() => resolve(false), 5000);

      const pongTopic = `tables/${tableNumber}/pong`;
      this.mqttClient.once("message", (topic, message) => {
        if (topic === pongTopic) {
          clearTimeout(timeout);
          resolve(true);
        }
      });
    });
  }

  async resetTable(tableNumber: number): Promise<void> {
    this.mqttClient.publish(`tables/${tableNumber}/reset`, "");
  }

  async disconnect(): Promise<void> {
    if (this.mqttClient.connected) {
      this.mqttClient.end();
    }
  }
}
