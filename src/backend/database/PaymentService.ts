import Database from "better-sqlite3";
import { BaseService } from "./BaseService";
import Logger from "@/shared/logger";
import { DatabaseError, NotFoundError } from "@/shared/types/errors";
import {
  Payment,
  CreatePaymentDTO,
  PaymentStatus,
} from "@/shared/types/Payment";

/**
 * PaymentService handles payment operations such as creating payments, retrieving them,
 * and processing refunds.
 */
export class PaymentService extends BaseService {
  constructor(db: Database.Database) {
    super(db);
    Logger.info("Initializing PaymentService");
    this.initializeTable();
  }

  /**
   * Creates the payments table if it does not exist.
   */
  private initializeTable(): void {
    try {
      Logger.info("Initializing payments table schema if not exists");
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS payments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sessionId INTEGER NOT NULL,
          amount DECIMAL(10,2) NOT NULL,
          paymentMethod TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'PAID',
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (sessionId) REFERENCES sessions(id)
        )
      `);
      Logger.info("Payments table schema initialized successfully");
    } catch (error) {
      Logger.error("Failed to initialize payments table: " + error);
      throw new DatabaseError("Failed to initialize payments table", { error });
    }
  }

  /**
   * Creates a new payment for a session.
   *
   * @param data - The payment creation details.
   * @returns The newly created Payment record.
   * @throws DatabaseError if payment creation fails.
   */
  async createPayment(data: CreatePaymentDTO): Promise<Payment> {
    try {
      Logger.info(
        `Creating payment for session ${data.sessionId} with amount ${data.amount}`
      );
      const stmt = this.db.prepare(`
        INSERT INTO payments (sessionId, amount, paymentMethod, status)
        VALUES (?, ?, ?, ?)
      `);
      const result = this.transaction(() => {
        return stmt.run(
          data.sessionId,
          data.amount,
          data.paymentMethod,
          PaymentStatus.PAID
        );
      });
      if (!result.lastInsertRowid) {
        Logger.error("Failed to create payment: no lastInsertRowid returned");
        throw new DatabaseError("Failed to create payment");
      }
      Logger.info(
        `Payment created successfully with id ${result.lastInsertRowid}`
      );
      return await this.getPaymentById(Number(result.lastInsertRowid));
    } catch (error) {
      Logger.error("Error creating payment: " + error);
      throw new DatabaseError("Failed to create payment", { error });
    }
  }

  /**
   * Retrieves a payment record by its unique identifier.
   *
   * @param id - The payment's unique identifier.
   * @returns The Payment record.
   * @throws NotFoundError if the payment is not found.
   */
  async getPaymentById(id: number): Promise<Payment> {
    try {
      Logger.info(`Fetching payment with id ${id}`);
      const stmt = this.db.prepare("SELECT * FROM payments WHERE id = ?");
      const payment = stmt.get(id) as Payment | undefined;
      if (!payment) {
        Logger.warn(`Payment with id ${id} not found`);
        throw new NotFoundError(`Payment with id ${id} not found`);
      }
      Logger.info(`Payment with id ${id} retrieved successfully`);
      return {
        ...payment,
        createdAt: new Date(payment.createdAt),
        updatedAt: new Date(payment.updatedAt),
      };
    } catch (error) {
      Logger.error("Error fetching payment: " + error);
      if (error instanceof NotFoundError) throw error;
      throw new DatabaseError("Failed to fetch payment by id", { error });
    }
  }

  /**
   * Retrieves all payments associated with a given session.
   *
   * @param sessionId - The unique identifier of the session.
   * @returns An array of Payment records.
   * @throws DatabaseError if the query fails.
   */
  async getPaymentsForSession(sessionId: number): Promise<Payment[]> {
    try {
      Logger.info(`Fetching payments for session ${sessionId}`);
      const stmt = this.db.prepare<[number], Payment>(`
        SELECT * FROM payments WHERE sessionId = ?
      `);
      const rows = stmt.all(sessionId);
      Logger.info(
        `Retrieved ${rows.length} payment(s) for session ${sessionId}`
      );
      return rows.map((row) => ({
        ...row,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
      }));
    } catch (error) {
      Logger.error("Error fetching payments for session: " + error);
      throw new DatabaseError("Failed to fetch payments for session", {
        error,
      });
    }
  }

  /**
   * Refunds a payment by updating its status to REFUNDED.
   *
   * @param paymentId - The unique identifier of the payment to refund.
   * @returns The updated Payment record.
   * @throws NotFoundError if the payment is not found or is already refunded.
   */
  async refundPayment(paymentId: number): Promise<Payment> {
    try {
      Logger.info(`Refunding payment with id ${paymentId}`);
      const stmt = this.db.prepare(`
        UPDATE payments 
        SET status = ?, updatedAt = CURRENT_TIMESTAMP 
        WHERE id = ? AND status = ?
      `);
      const result = this.transaction(() => {
        return stmt.run(PaymentStatus.REFUNDED, paymentId, PaymentStatus.PAID);
      });
      if (result.changes === 0) {
        Logger.warn(
          `Payment with id ${paymentId} not found or already refunded`
        );
        throw new NotFoundError(
          `Payment with id ${paymentId} not found or already refunded`
        );
      }
      Logger.info(`Payment with id ${paymentId} refunded successfully`);
      return await this.getPaymentById(paymentId);
    } catch (error) {
      Logger.error("Error refunding payment: " + error);
      if (error instanceof NotFoundError) throw error;
      throw new DatabaseError("Failed to refund payment", { error });
    }
  }
}
