import { Database } from "better-sqlite3";
import { BaseService } from "./BaseService";
import { Reservation, CreateReservationDTO } from "@/shared/types/Reservation";
import {
  DatabaseError,
  NotFoundError,
  BusinessError,
} from "@/shared/types/errors";
import Logger from "@/shared/logger";
import { TableService } from "./TableService";
import { PrayerService } from "./PrayerService";

/**
 * ReservationService handles reservations, including creation, confirmation, and cancellation.
 * It extends BaseService to leverage common database utilities such as transactions and logging.
 * It also uses PrayerService to check for prayer time conflicts.
 * The service is responsible for managing the reservations table.
 */
export class ReservationService extends BaseService {
  private tableService: TableService;
  private prayerService: PrayerService;

  constructor(db: Database) {
    super(db);
    this.tableService = new TableService(db);
    this.prayerService = new PrayerService();
    Logger.info("Initializing ReservationService");
    this.initializeTable();
  }

  /**
   * Initializes the reservations table if it does not exist.
   */
  private initializeTable(): void {
    try {
      Logger.info("Initializing reservations table schema if not exists");
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS reservations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tableId INTEGER NOT NULL,
          customerId INTEGER NOT NULL,
          startTime DATETIME NOT NULL,
          endTime DATETIME NOT NULL,
          status TEXT NOT NULL DEFAULT 'CONFIRMED',
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (tableId) REFERENCES tables(id)
        )
      `);
      Logger.info("Reservations table schema initialized successfully");
    } catch (error) {
      Logger.error("Failed to initialize reservations table: " + error);
      throw new DatabaseError("Failed to initialize reservations table", {
        error,
      });
    }
  }

  /**
   * Creates a new reservation for a pool table.
   *
   * @param data - The details required to create a reservation.
   * @returns The newly created Reservation record.
   * @throws BusinessError if a conflict (time overlap or prayer time conflict) is detected.
   * @throws DatabaseError on failure to create the reservation.
   */
  async createReservation(data: CreateReservationDTO): Promise<Reservation> {
    try {
      Logger.info(
        `Creating reservation for table ${data.tableId} from ${data.startTime} to ${data.endTime}`
      );

      // Verify table existence (this will throw NotFoundError if not found)
      const table = await this.tableService.getTableById(data.tableId);
      if (!table) {
        Logger.warn(`Table ${data.tableId} does not exist`);
        throw new BusinessError(`Table ${data.tableId} does not exist`);
      }

      // Check for overlapping reservations for the same table
      const conflict = this.checkReservationConflict(
        data.tableId,
        data.startTime.toISOString(),
        data.endTime.toISOString()
      );
      if (conflict) {
        Logger.warn(`Reservation conflict detected for table ${data.tableId}`);
        throw new BusinessError("Time slot is already reserved");
      }

      // Instantiate PrayerService and check for prayer time conflict
      const prayerConflict =
        await this.prayerService.isDuringPrayerTimeInterval(
          new Date(data.startTime),
          new Date(data.endTime)
        );
      if (prayerConflict) {
        Logger.warn("Reservation conflicts with prayer times");
        throw new BusinessError("Reservation conflicts with prayer times");
      }

      // Execute the insert within a transaction for atomicity
      const reservation = this.transaction(() => {
        Logger.info("Inserting new reservation record");
        const stmt = this.db.prepare(`
          INSERT INTO reservations (
            tableId,
            customerId,
            startTime,
            endTime,
            status
          ) VALUES (?, ?, ?, ?, ?)
        `);
        const result = stmt.run(
          data.tableId,
          data.customerId,
          new Date(data.startTime).toISOString(),
          new Date(data.endTime).toISOString(),
          "CONFIRMED"
        );
        if (!result.lastInsertRowid) {
          Logger.error(
            "Failed to create reservation: no lastInsertRowid returned"
          );
          throw new DatabaseError("Failed to create reservation");
        }
        Logger.info(`Reservation created with id ${result.lastInsertRowid}`);
        return this.getReservationById(Number(result.lastInsertRowid));
      });

      return reservation;
    } catch (error) {
      Logger.error(
        `Error creating reservation for table ${data.tableId}: ${error}`
      );
      if (error instanceof BusinessError || error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError("Failed to create reservation", { error });
    }
  }

  /**
   * Checks if a reservation time slot overlaps with any existing reservations.
   *
   * @param tableId - The table's unique identifier.
   * @param startTime - The desired start time of the reservation.
   * @param endTime - The desired end time of the reservation.
   * @returns True if a conflict exists, otherwise false.
   */
  private checkReservationConflict(
    tableId: number,
    startTime: string,
    endTime: string
  ): boolean {
    try {
      Logger.info(`Checking reservation conflicts for table ${tableId}`);
      const stmt = this.db.prepare(`
        SELECT * FROM reservations
        WHERE tableId = ?
          AND (
            (startTime <= ? AND endTime > ?)
            OR (startTime < ? AND endTime >= ?)
          )
      `);
      const conflicts = stmt.all(
        tableId,
        new Date(startTime).toISOString(),
        new Date(startTime).toISOString(),
        new Date(endTime).toISOString(),
        new Date(endTime).toISOString()
      );
      Logger.info(`Found ${conflicts.length} conflicting reservation(s)`);
      return conflicts.length > 0;
    } catch (error) {
      Logger.error("Error checking reservation conflicts: " + error);
      throw new DatabaseError("Error checking reservation conflicts", {
        error,
      });
    }
  }

  /**
   * Retrieves a reservation by its unique identifier.
   *
   * @param id - The reservation's unique identifier.
   * @returns The Reservation record.
   * @throws NotFoundError if the reservation is not found.
   */
  async getReservationById(id: number): Promise<Reservation> {
    try {
      Logger.info(`Fetching reservation with id ${id}`);
      const stmt = this.db.prepare("SELECT * FROM reservations WHERE id = ?");
      const reservation = stmt.get(id) as Reservation | undefined;
      if (!reservation) {
        Logger.warn(`Reservation with id ${id} not found`);
        throw new NotFoundError(`Reservation with id ${id} not found`);
      }
      Logger.info(`Reservation with id ${id} retrieved successfully`);
      return {
        ...reservation,
        startTime: new Date(reservation.startTime),
        endTime: new Date(reservation.endTime),
        createdAt: new Date(reservation.createdAt),
        updatedAt: new Date(reservation.updatedAt),
      };
    } catch (error) {
      Logger.error(`Error fetching reservation ${id}: ${error}`);
      if (error instanceof NotFoundError) throw error;
      throw new DatabaseError("Failed to fetch reservation by id", { error });
    }
  }

  /**
   * Retrieves all reservations for a specific table.
   *
   * @param tableId - The table's unique identifier.
   * @returns An array of Reservation records.
   * @throws DatabaseError on failure to retrieve reservations.
   */
  async getReservationsByTableId(tableId: number): Promise<Reservation[]> {
    try {
      Logger.info(`Fetching reservations for table ${tableId}`);
      const stmt = this.db.prepare(
        "SELECT * FROM reservations WHERE tableId = ?"
      );
      const reservations = stmt.all(tableId) as Reservation[];
      Logger.info(
        `Retrieved ${reservations.length} reservation(s) for table ${tableId}`
      );
      return reservations.map((reservation) => ({
        ...reservation,
        startTime: new Date(reservation.startTime),
        endTime: new Date(reservation.endTime),
        createdAt: new Date(reservation.createdAt),
        updatedAt: new Date(reservation.updatedAt),
      }));
    } catch (error) {
      Logger.error(
        `Error fetching reservations for table ${tableId}: ${error}`
      );
      throw new DatabaseError("Failed to fetch reservations for table", {
        error,
      });
    }
  }

  /**
   * Retrieves all reservations for a specific customer.
   *
   * @param customerId - The customer's unique identifier.
   * @returns An array of Reservation records.
   * @throws DatabaseError on failure to retrieve reservations.
   */
  async getReservationsByCustomerId(
    customerId: number
  ): Promise<Reservation[]> {
    try {
      Logger.info(`Fetching reservations for customer ${customerId}`);
      const stmt = this.db.prepare(
        "SELECT * FROM reservations WHERE customerId = ?"
      );
      const reservations = stmt.all(customerId) as Reservation[];
      Logger.info(
        `Retrieved ${reservations.length} reservation(s) for customer ${customerId}`
      );
      return reservations.map((reservation) => ({
        ...reservation,
        startTime: new Date(reservation.startTime),
        endTime: new Date(reservation.endTime),
        createdAt: new Date(reservation.createdAt),
        updatedAt: new Date(reservation.updatedAt),
      }));
    } catch (error) {
      Logger.error(
        `Error fetching reservations for customer ${customerId}: ${error}`
      );
      throw new DatabaseError("Failed to fetch reservations for customer", {
        error,
      });
    }
  }

  /**
   * Cancels a reservation by updating its status to 'CANCELLED'.
   *
   * @param id - The reservation's unique identifier.
   * @returns The updated Reservation record.
   * @throws NotFoundError if the reservation is not found or already cancelled.
   * @throws DatabaseError on failure to cancel the reservation.
   */
  async cancelReservation(id: number): Promise<Reservation> {
    try {
      Logger.info(`Cancelling reservation with id ${id}`);
      const stmt = this.db.prepare(`
        UPDATE reservations 
        SET status = 'CANCELLED',
            updatedAt = CURRENT_TIMESTAMP
        WHERE id = ? AND status != 'CANCELLED'
      `);
      const result = this.transaction(() => {
        return stmt.run(id);
      });
      if (result.changes === 0) {
        Logger.warn(`No changes made when cancelling reservation ${id}`);
        throw new NotFoundError(
          `Reservation with id ${id} not found or already cancelled`
        );
      }
      Logger.info(`Reservation ${id} cancelled successfully`);
      return await this.getReservationById(id);
    } catch (error) {
      Logger.error(`Error cancelling reservation ${id}: ${error}`);
      if (error instanceof NotFoundError) throw error;
      throw new DatabaseError("Failed to cancel reservation", { error });
    }
  }
}
