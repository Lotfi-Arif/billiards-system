import { WebSocketServer, WebSocket } from "ws";
import { TableWithSessions } from "@/shared/types/Table";
import { SessionData } from "@/shared/types/electronAPI";
import { WebSocketEvents } from "@/shared/types/websocket";

export class TableWebSocketServer {
  private wss: WebSocketServer;

  constructor(port: number = 8080) {
    this.wss = new WebSocketServer({ port });
    this.setupWebSocketServer();
    console.log(`WebSocket server started on port ${port}`);
  }

  private setupWebSocketServer() {
    this.wss.on("connection", (ws) => {
      console.log("Client connected to WebSocket");

      ws.on("message", (message) => {
        try {
          const data = JSON.parse(message.toString());
          console.log("Received message:", data);
          this.handleMessage(ws, data);
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      });

      ws.on("error", (error) => {
        console.error("WebSocket error:", error);
      });

      ws.on("close", () => {
        console.log("Client disconnected from WebSocket");
      });
    });
  }

  private handleMessage(ws: WebSocket, message: any) {
    // Handle different message types
    switch (message.type) {
      case "ping":
        ws.send(JSON.stringify({ type: "pong" }));
        break;
      // Add more message handlers as needed
    }
  }

  public broadcastTableUpdate(table: TableWithSessions) {
    this.broadcast(WebSocketEvents.TABLE_UPDATED, table);
  }

  public broadcastSessionUpdate(session: SessionData) {
    this.broadcast(WebSocketEvents.SESSION_UPDATED, session);
  }

  private broadcast(event: WebSocketEvents, data: any) {
    const message = JSON.stringify({ event, data });
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  public getServer(): WebSocketServer {
    return this.wss;
  }

  public close() {
    this.wss.close(() => {
      console.log("WebSocket server closed");
    });
  }
}
