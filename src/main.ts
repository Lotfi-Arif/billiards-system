import { app, BrowserWindow } from "electron";
import path from "node:path";
import Database from "better-sqlite3";
import { TableService } from "./backend/database/TableService";
import Logger from "./shared/logger";
import { initializeIpcHandlers } from "./ipc/handlers";
import started from "electron-squirrel-startup";
import { existsSync, mkdirSync } from "fs";

// Global references
let mainWindow: BrowserWindow | null = null;
let database: Database.Database | null = null;
let tableService: TableService | null = null;

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (started) {
  app.quit();
}

function initializeDatabase() {
  try {
    const userDataPath = app.getPath("userData");
    const dbPath = path.join(userDataPath, "poolhall.db");

    // Ensure the directory exists
    if (!existsSync(userDataPath)) {
      mkdirSync(userDataPath, { recursive: true });
    }

    Logger.info(`Initializing database at: ${dbPath}`);

    database = new Database(dbPath, {
      verbose:
        process.env.NODE_ENV === "development"
          ? (message?: unknown) => Logger.info(String(message))
          : undefined,
      fileMustExist: false,
      timeout: 5000,
    });

    database.pragma("journal_mode = WAL");
    database.pragma("foreign_keys = ON");

    tableService = new TableService(database);
    Logger.info("Database initialized successfully");
    return true;
  } catch (error) {
    Logger.error("Failed to initialize database:", error);
    if (database) {
      try {
        database.close();
      } catch (closeError) {
        Logger.error("Error closing database:", closeError);
      }
      database = null;
    }
    return false;
  }
}

const createWindow = () => {
  try {
    // Create the browser window.
    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, "preload.js"),
      },
    });

    // Load the app
    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
      mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
      mainWindow.webContents.openDevTools();
    } else {
      mainWindow.loadFile(
        path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
      );
    }

    mainWindow.on("closed", () => {
      mainWindow = null;
    });
  } catch (error) {
    Logger.error("Error creating window:", error);
    throw error;
  }
};

// Initialize app
app.whenReady().then(() => {
  try {
    const dbInitialized = initializeDatabase();
    if (!dbInitialized) {
      throw new Error("Failed to initialize database");
    }

    if (database && tableService) {
      initializeIpcHandlers(database, tableService);
    }

    createWindow();
  } catch (error) {
    Logger.error("Failed to initialize application:", error);
    app.quit();
  }
});

// Handle window management
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Cleanup
app.on("quit", () => {
  if (database) {
    try {
      database.close();
    } catch (error) {
      Logger.error("Error closing database on quit:", error);
    }
  }
});
