import { SerialPort } from "serialport";
import path from "path";
import { app } from "electron";
import Logger from "../shared/logger";
import fs from "fs";

// Standardize the app name across the application
const APP_NAME = "complete-billiards-system";
const DB_NAME = "pool-hall.db";

export class PlatformUtils {
  static getPlatform() {
    return process.platform;
  }

  static getUIPath() {
    return path.join(app.getAppPath(), "dist", "renderer", "index.html");
  }

  static isWindows() {
    return process.platform === "win32";
  }

  static isMac() {
    return process.platform === "darwin";
  }

  static isLinux() {
    return process.platform === "linux";
  }

  static getAppDataPath() {
    try {
      // Standardize the path creation across platforms
      const basePath = path.join(
        this.isMac() ? app.getPath("userData") : app.getPath("appData"),
        APP_NAME
      );

      // Ensure the directory exists
      if (!fs.existsSync(basePath)) {
        fs.mkdirSync(basePath, { recursive: true });
        Logger.info(`Created app data directory at: ${basePath}`);
      }

      Logger.info(`App data path: ${basePath}`);
      return basePath;
    } catch (error) {
      Logger.error("Error getting app data path:", error);
      throw error;
    }
  }

  static getDatabasePath() {
    try {
      const dbPath = path.join(this.getAppDataPath(), DB_NAME);
      Logger.info(`Database path: ${dbPath}`);
      return dbPath;
    } catch (error) {
      Logger.error("Error getting database path:", error);
      throw error;
    }
  }

  static async getSerialPorts() {
    try {
      const ports = await SerialPort.list();
      Logger.info("Available serial ports:", ports);
      return ports;
    } catch (error) {
      Logger.error("Error listing serial ports:", error);
      return [];
    }
  }

  static async findArduinoPort() {
    try {
      const ports = await this.getSerialPorts();
      const arduinoPatterns = {
        win32: /COM[0-9]+/,
        darwin: /\/dev\/cu\.usbmodem|\/dev\/cu\.usbserial/,
        linux: /\/dev\/ttyUSB|\/dev\/ttyACM/,
      };

      const pattern =
        arduinoPatterns[process.platform as keyof typeof arduinoPatterns];
      const arduinoPort = ports.find((port) => pattern.test(port.path));

      if (arduinoPort) {
        Logger.info("Found Arduino port:", arduinoPort.path);
        return arduinoPort.path;
      }

      Logger.warn("No Arduino port found");
      return null;
    } catch (error) {
      Logger.error("Error finding Arduino port:", error);
      return null;
    }
  }

  static getDefaultSerialConfig() {
    return {
      baudRate: 9600,
      dataBits: 8,
      parity: "none" as const,
      stopBits: 1,
      autoOpen: false,
    };
  }

  static async ensureAppDirectories() {
    try {
      const directories = {
        appData: this.getAppDataPath(),
        logs: path.join(this.getAppDataPath(), "logs"),
        temp: path.join(this.getAppDataPath(), "temp"),
        config: path.join(this.getAppDataPath(), "config"),
      };

      // Create all directories
      for (const [key, dir] of Object.entries(directories)) {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
          Logger.info(`Created ${key} directory at: ${dir}`);
        }
      }

      return directories;
    } catch (error) {
      Logger.error("Error ensuring app directories:", error);
      throw error;
    }
  }

  static logAppPaths() {
    try {
      const paths = {
        appName: APP_NAME,
        appDataPath: this.getAppDataPath(),
        databasePath: this.getDatabasePath(),
        userData: app.getPath("userData"),
        appData: app.getPath("appData"),
        temp: app.getPath("temp"),
        exe: app.getPath("exe"),
        home: app.getPath("home"),
        appPath: app.getAppPath(),
      };

      Logger.info("Application paths:", paths);
      return paths;
    } catch (error) {
      Logger.error("Error getting app paths:", error);
      throw error;
    }
  }
}
