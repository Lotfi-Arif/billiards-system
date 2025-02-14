import Database from "better-sqlite3";
import { BaseService } from "./BaseService";
import Logger from "@/shared/logger";
import { DatabaseError } from "@/shared/types/errors";

/**
 * ReportService generates various reports for the pool table management system.
 * It can generate revenue reports, table usage statistics, and reservation summaries.
 */
export class ReportService extends BaseService {
  constructor(db: Database.Database) {
    super(db);
    Logger.info("Initializing ReportService");
  }

  /**
   * Generates a revenue report for sessions over a specified date range.
   *
   * @param startDate - The start date for the report.
   * @param endDate - The end date for the report.
   * @returns An array of objects representing daily revenue.
   * @throws DatabaseError if the query fails.
   */
  async getRevenueReport(
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ date: string; revenue: number }>> {
    try {
      Logger.info(
        `Generating revenue report from ${startDate.toISOString()} to ${endDate.toISOString()}`
      );
      const stmt = this.db.prepare<
        [string, string],
        { date: string; revenue: number }
      >(`
        SELECT date(createdAt) as date, SUM(cost) as revenue
        FROM sessions
        WHERE createdAt BETWEEN ? AND ?
        GROUP BY date(createdAt)
        ORDER BY date(createdAt)
      `);
      const rows = stmt.all(startDate.toISOString(), endDate.toISOString());
      Logger.info(`Revenue report generated with ${rows.length} row(s)`);
      return rows;
    } catch (error) {
      Logger.error("Error generating revenue report: " + error);
      throw new DatabaseError("Failed to generate revenue report", { error });
    }
  }

  /**
   * Generates a table usage report by counting the number of sessions per table.
   *
   * @returns An array of objects representing table usage statistics.
   * @throws DatabaseError if the query fails.
   */
  async getTableUsageReport(): Promise<
    Array<{ tableId: number; sessionsCount: number }>
  > {
    try {
      Logger.info("Generating table usage report");
      const stmt = this.db.prepare<
        [],
        { tableId: number; sessionsCount: number }
      >(`
        SELECT tableId, COUNT(*) as sessionsCount
        FROM sessions
        GROUP BY tableId
        ORDER BY sessionsCount DESC
      `);
      const rows = stmt.all();
      Logger.info(`Table usage report generated with ${rows.length} row(s)`);
      return rows;
    } catch (error) {
      Logger.error("Error generating table usage report: " + error);
      throw new DatabaseError("Failed to generate table usage report", {
        error,
      });
    }
  }

  /**
   * Generates a reservation summary report that counts reservations by their status.
   *
   * @returns An object containing counts of reservations for each status.
   * @throws DatabaseError if the query fails.
   */
  async getReservationSummary(): Promise<{
    confirmed: number;
    cancelled: number;
    completed: number;
    pending: number;
  }> {
    try {
      Logger.info("Generating reservation summary report");
      const stmt = this.db.prepare<[], { status: string; count: number }>(`
        SELECT status, COUNT(*) as count
        FROM reservations
        GROUP BY status
      `);
      const rows = stmt.all();
      // Initialize summary with zeros.
      const summary = {
        confirmed: 0,
        cancelled: 0,
        completed: 0,
        pending: 0,
      };
      for (const row of rows) {
        // Normalize the status to lowercase.
        const status = row.status.toLowerCase();
        if (status in summary) {
          summary[status as keyof typeof summary] = row.count;
        }
      }
      Logger.info("Reservation summary report generated successfully");
      return summary;
    } catch (error) {
      Logger.error("Error generating reservation summary report: " + error);
      throw new DatabaseError("Failed to generate reservation summary report", {
        error,
      });
    }
  }
}
