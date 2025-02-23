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

interface CurrentUserState {
  userId: string | null;
  token: string | null;
}

const userState: CurrentUserState = {
  userId: null,
  token: null,
};

// Initialize services
const wss = new WebSocketServer({ port: config.ws.port });
const prisma = new PrismaClient();
const arduinoService = new ArduinoControlService(
  prisma,
  wss,
  config.mqtt.broker
);
const userService = new UserService(prisma);
const tableService = new PoolTableService(prisma);

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
  wss.close();
  await prisma.$disconnect();
}

// Handle app lifecycle
app.whenReady().then(() => {
  setupIpcHandlers();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
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
