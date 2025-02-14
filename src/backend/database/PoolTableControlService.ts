import { TableService } from "./TableService";
import { ArduinoControlService } from "./ArduinoControlService";
import Logger from "@/shared/logger";
import { DatabaseError, BusinessError } from "@/shared/types/errors";
import { TableStatus } from "@/shared/types/Table";

/**
 * PoolTableControlService coordinates the logical and hardware state of pool tables.
 * It uses TableService to update table statuses and ArduinoControlService to signal
 * hardware changes such as lights.
 */
export class PoolTableControlService {
  private tableService: TableService;
  private arduinoService: ArduinoControlService;

  /**
   * Constructs a new PoolTableControlService.
   *
   * @param tableService - An instance of TableService to update table statuses.
   * @param arduinoService - An instance of ArduinoControlService to send hardware commands.
   */
  constructor(
    tableService: TableService,
    arduinoService: ArduinoControlService
  ) {
    this.tableService = tableService;
    this.arduinoService = arduinoService;
    Logger.info("PoolTableControlService initialized");
  }

  /**
   * Opens a pool table for use.
   * This method updates the table status to "AVAILABLE" and signals the hardware
   * that the table is ready (e.g., turns on lights).
   *
   * @param tableId - The unique identifier of the pool table.
   * @throws BusinessError if the table is in cooldown and cannot be opened.
   */
  async openTable(tableId: number): Promise<void> {
    try {
      Logger.info(`Attempting to open table ${tableId}`);
      // Retrieve current table info.
      const table = await this.tableService.getTableById(tableId);
      if (table.status === "COOLDOWN") {
        Logger.warn(
          `Table ${tableId} is currently in cooldown and cannot be opened`
        );
        throw new BusinessError(`Table ${tableId} is in a cooldown period`);
      }
      // Update table status to AVAILABLE (or OPEN).
      await this.tableService.updateTableStatus(tableId, {
        status: TableStatus.AVAILABLE,
      });
      // Signal the hardware that the table is ready.
      await this.arduinoService.signalTableReady();
      Logger.info(`Table ${tableId} opened successfully`);
    } catch (error) {
      Logger.error(`Error opening table ${tableId}: ${error}`);
      throw error;
    }
  }

  /**
   * Closes a pool table.
   * This method updates the table status to "OFF" and signals the hardware to turn off
   * the table (e.g., turn off lights).
   *
   * @param tableId - The unique identifier of the pool table.
   */
  async closeTable(tableId: number): Promise<void> {
    try {
      Logger.info(`Attempting to close table ${tableId}`);
      await this.tableService.updateTableStatus(tableId, {
        status: TableStatus.OFF,
      });
      await this.arduinoService.signalTableOff();
      Logger.info(`Table ${tableId} closed successfully`);
    } catch (error) {
      Logger.error(`Error closing table ${tableId}: ${error}`);
      throw error;
    }
  }

  /**
   * Puts a pool table into a cooldown state for a specified duration.
   * When in cooldown, new sessions cannot be started on the table.
   * The table status is set to "COOLDOWN" and a timer is scheduled to reopen the table
   * automatically after the cooldown period expires.
   *
   * @param tableId - The unique identifier of the pool table.
   * @param cooldownMinutes - The cooldown duration in minutes.
   */
  async setTableCooldown(
    tableId: number,
    cooldownMinutes: number
  ): Promise<void> {
    try {
      Logger.info(
        `Setting cooldown for table ${tableId} for ${cooldownMinutes} minutes`
      );
      // Update table status to COOLDOWN.
      await this.tableService.updateTableStatus(tableId, {
        status: TableStatus.COOLDOWN,
      });
      // Optionally, signal hardware if needed (e.g., to turn off lights).
      await this.arduinoService.signalTableOff();
      // Schedule automatic reopening after the cooldown period.
      setTimeout(async () => {
        try {
          Logger.info(
            `Cooldown period ended for table ${tableId}; reopening table`
          );
          await this.openTable(tableId);
        } catch (error) {
          Logger.error(
            `Error reopening table ${tableId} after cooldown: ${error}`
          );
        }
      }, cooldownMinutes * 60 * 1000);
      Logger.info(
        `Table ${tableId} is now in cooldown for ${cooldownMinutes} minutes`
      );
    } catch (error) {
      Logger.error(`Error setting cooldown for table ${tableId}: ${error}`);
      throw new DatabaseError(`Failed to set cooldown for table ${tableId}`, {
        error,
      });
    }
  }
}
