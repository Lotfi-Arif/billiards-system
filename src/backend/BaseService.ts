import { PrismaClient } from "@prisma/client";
import { WebSocket, Server } from "ws";

export class BaseService {
  protected prisma: PrismaClient;
  protected wss?: Server;

  constructor(prisma: PrismaClient, wss?: Server) {
    this.prisma = prisma;
    this.wss = wss;
  }

  protected broadcastEvent(event: string, data: any) {
    if (this.wss) {
      const message = JSON.stringify({ event, data });
      this.wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    }
  }

  protected async logActivity(
    userId: string,
    action: string,
    details?: string
  ) {
    return this.prisma.activityLog.create({
      data: {
        userId,
        action,
        details,
      },
    });
  }
}
