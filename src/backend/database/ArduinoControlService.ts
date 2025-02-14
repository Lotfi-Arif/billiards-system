import { SerialPort } from "serialport";
import Logger from "@/shared/logger";
import { BusinessError } from "@/shared/types/errors";

/**
 * ArduinoControlService handles communication with an Arduino device via serial port.
 * This version supports multiple platforms and includes automatic port detection.
 */
export class ArduinoControlService {
  private port: SerialPort | null = null;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 3;
  private readonly RECONNECT_DELAY = 2000; // 2 seconds

  /**
   * Initializes the Arduino control service.
   * It will attempt to automatically find and connect to the Arduino.
   */
  constructor() {
    this.initializeArduino();
  }

  /**
   * Attempts to find and connect to the Arduino on the appropriate port for the current platform.
   */
  private async initializeArduino(): Promise<void> {
    try {
      const portPath = await this.findArduinoPort();
      if (!portPath) {
        throw new Error("No Arduino port found");
      }

      this.port = new SerialPort({
        path: portPath,
        baudRate: 9600,
        dataBits: 8,
        parity: "none",
        stopBits: 1,
        autoOpen: false,
      });

      this.setupPortListeners();
      await this.connect();
    } catch (error) {
      Logger.error("Failed to initialize Arduino:", error);
      this.handleConnectionError(error);
    }
  }

  /**
   * Attempts to find the Arduino port based on the current platform.
   */
  private async findArduinoPort(): Promise<string | null> {
    try {
      const ports = await SerialPort.list();
      Logger.info("Available serial ports:", ports);

      // Platform-specific port patterns
      const portPatterns = {
        win32: /COM[0-9]+/,
        darwin: /\/dev\/cu\.usbmodem|\/dev\/cu\.usbserial/,
        linux: /\/dev\/ttyUSB|\/dev\/ttyACM/,
      };

      const pattern =
        portPatterns[process.platform as keyof typeof portPatterns];
      const arduinoPort = ports.find((port) => pattern.test(port.path));

      if (arduinoPort) {
        Logger.info("Found Arduino port:", arduinoPort.path);
        return arduinoPort.path;
      }

      Logger.warn("No Arduino port found");
      return null;
    } catch (error) {
      Logger.error("Error listing serial ports:", error);
      return null;
    }
  }

  /**
   * Sets up event listeners for the serial port.
   */
  private setupPortListeners(): void {
    if (!this.port) return;

    this.port.on("open", () => {
      Logger.info("Arduino port opened");
      this.isConnected = true;
      this.reconnectAttempts = 0;
    });

    this.port.on("error", (error) => {
      Logger.error("Arduino port error:", error);
      this.handleConnectionError(error);
    });

    this.port.on("close", () => {
      Logger.info("Arduino port closed");
      this.isConnected = false;
      this.handleConnectionError(new Error("Port closed unexpectedly"));
    });

    this.port.on("data", (data) => {
      Logger.info("Received data from Arduino:", data.toString());
      // Handle any responses from Arduino if needed
    });
  }

  /**
   * Attempts to connect to the Arduino.
   */
  private async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.port) {
        reject(new Error("Serial port not initialized"));
        return;
      }

      this.port.open((error) => {
        if (error) {
          Logger.error("Error opening Arduino port:", error);
          reject(error);
        } else {
          this.isConnected = true;
          resolve();
        }
      });
    });
  }

  /**
   * Handles connection errors and attempts reconnection if appropriate.
   */
  private async handleConnectionError(error: any): Promise<void> {
    Logger.error("Arduino connection error:", error);
    this.isConnected = false;

    if (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
      this.reconnectAttempts++;
      Logger.info(
        `Attempting to reconnect (${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS})`
      );

      await new Promise((resolve) => setTimeout(resolve, this.RECONNECT_DELAY));
      await this.initializeArduino();
    } else {
      Logger.error("Max reconnection attempts reached");
    }
  }

  /**
   * Sends a command string to the Arduino.
   * @param command - The command to send (e.g., "LIGHTS_ON").
   * @throws BusinessError if the command fails to send or the device is not connected.
   */
  public async sendCommand(command: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.port || !this.isConnected) {
        reject(new BusinessError("Arduino not connected"));
        return;
      }

      const commandWithNewline = command + "\n";
      this.port.write(commandWithNewline, (error) => {
        if (error) {
          Logger.error("Error sending command to Arduino:", error);
          reject(
            new BusinessError(
              `Error sending command to Arduino: ${error.message}`
            )
          );
        } else {
          Logger.info("Command sent to Arduino:", command);
          resolve();
        }
      });
    });
  }

  /**
   * Returns the current connection status of the Arduino.
   */
  public isArduinoConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Cleanly disconnects from the Arduino.
   */
  public async disconnect(): Promise<void> {
    return new Promise((resolve) => {
      if (this.port && this.isConnected) {
        this.port.close(() => {
          this.isConnected = false;
          this.port = null;
          Logger.info("Arduino disconnected");
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Turns the pool table lights on.
   */
  public async turnLightsOn(): Promise<void> {
    return this.sendCommand("LIGHTS_ON");
  }

  /**
   * Turns the pool table lights off.
   */
  public async turnLightsOff(): Promise<void> {
    return this.sendCommand("LIGHTS_OFF");
  }

  /**
   * Sends a command to indicate that the pool table is in a "ready" state.
   */
  public async signalTableReady(): Promise<void> {
    return this.sendCommand("TABLE_READY");
  }

  /**
   * Sends a command to signal that a pool table should be turned off.
   */
  public async signalTableOff(): Promise<void> {
    return this.sendCommand("TABLE_OFF");
  }
}
