import { app, BrowserWindow } from "electron";
import path from "node:path";
import started from "electron-squirrel-startup";
import { UserService } from "./backend/UserService";
import { PoolTableService } from "./backend/PoolTableService";
import { PrismaClient } from "@prisma/client";
import { ArduinoControlService } from "./backend/ArduinoControlService";
import { WebSocketServer } from "ws";
import { config } from "./config";
import { setupAuthHandlers, setupTableHandlers } from "./ipc/handlers";
import { WebSocketEvents } from "./shared/types/websocket";
import { TableWebSocketServer } from "@backend/TableWebSocketServer";

interface CurrentUserState {
  userId: string | null;
  token: string | null;
}

const userState: CurrentUserState = {
  userId: null,
  token: null,
};

// Initialize WebSocket server with enhanced functionality
const wsServer = new TableWebSocketServer(config.ws.port);
const wss = wsServer.getServer();

// Initialize services
const prisma = new PrismaClient();
const arduinoService = new ArduinoControlService(
  prisma,
  wss,
  config.mqtt.broker
);
const userService = new UserService(prisma);
const tableService = new PoolTableService(prisma, wss);

if (started) {
  app.quit();
}

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Load the app
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
  }

  // Open DevTools in development
  if (process.env.NODE_ENV === "development") {
    mainWindow.webContents.openDevTools();
  }

  return mainWindow;
};

// IPC Handlers
function setupIpcHandlers() {
  setupTableHandlers(tableService);
  setupAuthHandlers(userService);
}

// Cleanup function
async function cleanup() {
  if (userState.userId) {
    try {
      await userService.logout(userState.userId);
    } catch (error) {
      console.error("Error during logout cleanup:", error);
    }
  }
  await arduinoService.disconnect();
  wsServer.close();
  await prisma.$disconnect();
}

// Enhanced WebSocket message handling
wss.on("connection", (ws) => {
  console.log("Client connected to WebSocket");

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log("Received WebSocket message:", data);
      
      // Handle different message types
      switch (data.type) {
        case "TABLE_UPDATE":
          broadcastUpdate(WebSocketEvents.TABLE_UPDATED, data.payload);
          break;
        case "SESSION_UPDATE":
          broadcastUpdate(WebSocketEvents.SESSION_UPDATED, data.payload);
          break;
        case "PRAYER_TIME_UPDATE":
          broadcastUpdate(WebSocketEvents.PRAYER_TIME_UPDATED, data.payload);
          break;
        default:
          console.log("Unhandled message type:", data.type);
      }
    } catch (error) {
      console.error("Invalid message format:", error);
    }
  });

  ws.on("error", (error) => {
    console.error("WebSocket client error:", error);
  });

  ws.on("close", () => {
    console.log("Client disconnected from WebSocket");
  });
});

// Function to broadcast updates
function broadcastUpdate(event: WebSocketEvents, data: any) {
  const message = JSON.stringify({ event, data });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Handle app lifecycle
app.whenReady().then(() => {
  const mainWindow = createWindow();
  setupIpcHandlers();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  // Log successful startup
  console.log(`Application started successfully. WebSocket server running on port ${config.ws.port}`);
});

// Handle app shutdown
app.on("window-all-closed", async () => {
  await cleanup();
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Handle uncaught exceptions
process.on("uncaughtException", async (error) => {
  console.error("Uncaught Exception:", error);
  await cleanup();
  app.quit();
});

// Handle unhandled promise rejections
process.on("unhandledRejection", async (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  await cleanup();
  app.quit();
});

// Export necessary items for testing
export { broadcastUpdate, cleanup };