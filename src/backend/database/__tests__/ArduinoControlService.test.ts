// src/backend/database/__tests__/ArduinoControlService.test.ts
import { ArduinoControlService } from "../ArduinoControlService";
import { SerialPort } from "serialport";
import { PlatformUtils } from "../../../utils/platform";
import Logger from "@/shared/logger";

// Mock Logger
jest.mock("@/shared/logger", () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

// Create mock instance before tests
const mockOn = jest.fn();
const mockWrite = jest.fn();
const mockOpen = jest.fn();
const mockClose = jest.fn();

const mockSerialPortInstance = {
  on: mockOn,
  write: mockWrite,
  open: mockOpen,
  close: mockClose,
};

// Mock SerialPort
jest.mock("serialport", () => ({
  SerialPort: jest.fn().mockImplementation(() => mockSerialPortInstance),
}));

// Mock PlatformUtils
jest.mock("../../../utils/platform", () => ({
  PlatformUtils: {
    findArduinoPort: jest.fn(),
    getDefaultSerialConfig: jest.fn().mockReturnValue({
      baudRate: 9600,
      dataBits: 8,
      parity: "none",
      stopBits: 1,
      autoOpen: false,
    }),
  },
}));

describe("ArduinoService", () => {
  let service: ArduinoControlService;
  const defaultPortPath = "/dev/ttyUSB0";

  beforeEach(async () => {
    jest.clearAllMocks();
    (PlatformUtils.findArduinoPort as jest.Mock).mockResolvedValue(
      defaultPortPath
    );

    // Reset mock instance state
    mockOn.mockReset();
    mockWrite.mockReset();
    mockOpen.mockReset();
    mockClose.mockReset();

    // Create service instance
    service = new ArduinoControlService();

    // Wait for initialization to complete
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  describe("initialization", () => {
    it("should initialize with platform-specific port", async () => {
      expect(PlatformUtils.findArduinoPort).toHaveBeenCalled();
      expect(SerialPort).toHaveBeenCalledWith({
        path: defaultPortPath,
        baudRate: 9600,
        dataBits: 8,
        parity: "none",
        stopBits: 1,
        autoOpen: false,
      });
    });

    it("should handle port detection failure", async () => {
      (PlatformUtils.findArduinoPort as jest.Mock).mockResolvedValue(null);
      //   const newService = new ArduinoService();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(Logger.error).toHaveBeenCalledWith(
        expect.stringContaining("Failed to initialize Arduino"),
        expect.any(Error)
      );
    });

    it("should set up all required event listeners", () => {
      expect(mockOn).toHaveBeenCalledWith("open", expect.any(Function));
      expect(mockOn).toHaveBeenCalledWith("error", expect.any(Function));
      expect(mockOn).toHaveBeenCalledWith("close", expect.any(Function));
      expect(mockOn).toHaveBeenCalledWith("data", expect.any(Function));
    });

    it("should attempt reconnection on connection failure", async () => {
      const error = new Error("Connection failed");
      const errorHandlerCall = mockOn.mock.calls.find(
        (call) => call[0] === "error"
      );
      if (!errorHandlerCall) throw new Error("Error handler not found");
      const errorHandler = errorHandlerCall[1];

      errorHandler(error);

      expect(Logger.error).toHaveBeenCalledWith(
        expect.stringContaining("Arduino connection error"),
        error
      );

      await new Promise((resolve) => setTimeout(resolve, 2100));
      expect(PlatformUtils.findArduinoPort).toHaveBeenCalledTimes(2);
    });
  });

  describe("connection management", () => {
    it("should handle successful connection", async () => {
      mockOpen.mockImplementation((callback) => callback(null));
      const openCall = mockOn.mock.calls.find((call) => call[0] === "open");
      if (!openCall) throw new Error("Open handler not found");
      const openHandler = openCall[1];

      openHandler();
      expect(Logger.info).toHaveBeenCalledWith(
        expect.stringContaining("Arduino port opened")
      );
    });

    it("should handle connection errors", async () => {
      const error = new Error("Connection failed");
      mockOpen.mockImplementation((callback) => callback(error));

      await expect(service["connect"]()).rejects.toThrow(
        "Error opening Arduino port"
      );
    });

    it("should handle disconnection", async () => {
      await service.disconnect();
      expect(mockClose).toHaveBeenCalled();
    });
  });

  describe("command sending", () => {
    beforeEach(() => {
      const openCall = mockOn.mock.calls.find((call) => call[0] === "open");
      if (openCall) openCall[1]();
    });

    it("should send command with newline character", async () => {
      mockWrite.mockImplementation((_, callback) => callback(null));

      await service.sendCommand("TEST_COMMAND");
      expect(mockWrite).toHaveBeenCalledWith(
        "TEST_COMMAND\n",
        expect.any(Function)
      );
      expect(Logger.info).toHaveBeenCalledWith(
        expect.stringContaining("Command sent to Arduino: TEST_COMMAND")
      );
    });

    it("should handle write errors", async () => {
      const error = new Error("Write failed");
      mockWrite.mockImplementation((_, callback) => callback(error));

      await expect(service.sendCommand("TEST_COMMAND")).rejects.toThrow(
        "Error sending command to Arduino"
      );
      expect(Logger.error).toHaveBeenCalledWith(
        expect.stringContaining("Error sending command to Arduino"),
        error
      );
    });

    it("should reject commands when not connected", async () => {
      service["isConnected"] = false;
      await expect(service.sendCommand("TEST_COMMAND")).rejects.toThrow(
        "Arduino not connected"
      );
    });
  });

  describe("connection status", () => {
    it("should report correct connection status", () => {
      expect(service.isArduinoConnected()).toBeFalsy();

      const openCall = mockOn.mock.calls.find((call) => call[0] === "open");
      if (openCall) openCall[1]();

      expect(service.isArduinoConnected()).toBeTruthy();
    });

    it("should handle unexpected disconnection", () => {
      const openCall = mockOn.mock.calls.find((call) => call[0] === "open");
      if (openCall) openCall[1]();

      const closeCall = mockOn.mock.calls.find((call) => call[0] === "close");
      if (closeCall) closeCall[1]();

      expect(service.isArduinoConnected()).toBeFalsy();
    });
  });

  describe("error handling", () => {
    it("should limit reconnection attempts", async () => {
      const error = new Error("Connection failed");
      const errorHandler = mockOn.mock.calls.find(
        (call) => call[0] === "error"
      )[1];

      for (let i = 0; i < 4; i++) {
        errorHandler(error);
        await new Promise((resolve) => setTimeout(resolve, 2100));
      }

      expect(PlatformUtils.findArduinoPort).toHaveBeenCalledTimes(4);
      expect(Logger.error).toHaveBeenCalledWith(
        expect.stringContaining("Max reconnection attempts reached")
      );
    });

    it("should handle data reception", () => {
      const dataHandler = mockOn.mock.calls.find(
        (call) => call[0] === "data"
      )[1];

      const testData = Buffer.from("Test data");
      dataHandler(testData);
      expect(Logger.info).toHaveBeenCalledWith(
        expect.stringContaining("Received data from Arduino:"),
        expect.stringContaining("Test data")
      );
    });
  });
});
