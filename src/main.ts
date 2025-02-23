import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import started from "electron-squirrel-startup";
import { IpcChannels, TableOperations } from "@/shared/types/ipc";
import { UserService } from "./backend/UserService";
import { PoolTableService } from "./backend/PoolTableService";
import { ApiResponse } from "./shared/types/electronAPI";
import { PrismaClient } from "@prisma/client";
import { ArduinoControlService } from "./backend/ArduinoControlService";
import { WebSocketServer } from "ws";
import { config } from "./config";
import { UserDTO } from "./shared/types/User";

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
const tableService = new PoolTableService(prisma, arduinoService);

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
  ipcMain.handle(
    IpcChannels.AUTH_LOGIN,
    async (
      _,
      args
    ): Promise<
      ApiResponse<TableOperations[IpcChannels.AUTH_LOGIN]["response"]>
    > => {
      try {
        const result = await userService.login(args);
        // Store user state on successful login
        userState.userId = result.user.id;
        userState.token = result.token;
        return { success: true, data: result };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Login failed",
        };
      }
    }
  );

  ipcMain.handle(
    IpcChannels.AUTH_LOGOUT,
    async (): Promise<ApiResponse<void>> => {
      try {
        if (!userState.userId) {
          throw new Error("No user is currently logged in");
        }
        await userService.logout(userState.userId);
        // Clear user state on logout
        userState.userId = null;
        userState.token = null;
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Logout failed",
        };
      }
    }
  );

  ipcMain.handle(
    IpcChannels.AUTH_GET_CURRENT_USER,
    async (): Promise<
      ApiResponse<
        TableOperations[IpcChannels.AUTH_GET_CURRENT_USER]["response"]
      >
    > => {
      try {
        if (!userState.userId) {
          return { success: true, data: null };
        }
        const user = await userService.getCurrentUser(userState.userId);
        if (!user) {
          return { success: true, data: null };
        }
        const currentUser: UserDTO = {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
        return { success: true, data: currentUser };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to get current user",
        };
      }
    }
  );

  // Table handlers
  ipcMain.handle(
    IpcChannels.TABLE_GET_ALL,
    async (): Promise<ApiResponse<any>> => {
      try {
        const tables = await tableService.getAllTables();
        return { success: true, data: tables };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to fetch tables",
        };
      }
    }
  );

  ipcMain.handle(
    IpcChannels.TABLE_CREATE,
    async (_, args): Promise<ApiResponse<any>> => {
      try {
        const table = await tableService.createTable(args.number);
        return { success: true, data: table };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to create table",
        };
      }
    }
  );

  ipcMain.handle(
    IpcChannels.TABLE_OPEN,
    async (_, args): Promise<ApiResponse<any>> => {
      try {
        const table = await tableService.openTable(
          args.tableId,
          args.userId,
          args.sessionType,
          args.duration
        );
        return { success: true, data: table };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to open table",
        };
      }
    }
  );

  ipcMain.handle(
    IpcChannels.TABLE_CLOSE,
    async (_, args): Promise<ApiResponse<any>> => {
      try {
        const table = await tableService.closeTable(args.tableId, args.userId);
        return { success: true, data: table };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to close table",
        };
      }
    }
  );

  ipcMain.handle(
    IpcChannels.TABLE_UPDATE,
    async (_, args): Promise<ApiResponse<any>> => {
      try {
        const table = await tableService.updateTable(
          args.tableId,
          args.userId,
          args.data
        );
        return { success: true, data: table };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to update table",
        };
      }
    }
  );

  ipcMain.handle(
    IpcChannels.TABLE_MAINTENANCE,
    async (_, args): Promise<ApiResponse<any>> => {
      try {
        const table = await tableService.setTableMaintenance(
          args.tableId,
          args.userId
        );
        return { success: true, data: table };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to set table maintenance",
        };
      }
    }
  );
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
