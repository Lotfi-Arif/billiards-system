// src/backend/ReservationService.ts
import {
  PrismaClient,
  ReservationStatus,
  TableStatus,
  Reservation,
  PoolTable,
  User,
} from "@prisma/client";
import { BaseService } from "./BaseService";
import { WebSocketServer } from "ws";
import logger from "@/shared/logger";

type ReservationWithRelations = Reservation & {
  table: PoolTable;
  user: Pick<User, "id" | "name" | "email">;
};

interface CreateReservationDTO {
  tableId: string;
  userId: string;
  startTime: Date;
  duration: number; // in minutes
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  numberOfPeople?: number;
  notes?: string;
}

interface TableSlots {
  tableNumber: number;
  slots: Record<string, boolean>;
}

interface UpdateReservationDTO {
  status?: ReservationStatus;
  startTime?: Date;
  duration?: number;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  numberOfPeople?: number;
  notes?: string;
}

interface TableAvailability {
  [tableId: string]: TableSlots;
}

export class ReservationService extends BaseService {
  constructor(prisma: PrismaClient, wss?: WebSocketServer) {
    super(prisma, wss);
  }

  async getAllReservations(): Promise<ReservationWithRelations[]> {
    try {
      return await this.prisma.reservation.findMany({
        include: {
          table: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          startTime: "asc",
        },
      });
    } catch (error) {
      logger.error("Error getting all reservations:", error);
      throw error;
    }
  }

  async getReservationsByDate(date: Date): Promise<ReservationWithRelations[]> {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      return await this.prisma.reservation.findMany({
        where: {
          startTime: {
            gte: startOfDay,
            lt: endOfDay,
          },
        },
        include: {
          table: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          startTime: "asc",
        },
      });
    } catch (error) {
      logger.error("Error getting reservations by date:", error);
      throw error;
    }
  }

  async getReservationById(
    id: string
  ): Promise<ReservationWithRelations | null> {
    try {
      return await this.prisma.reservation.findUnique({
        where: { id },
        include: {
          table: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
    } catch (error) {
      logger.error("Error getting reservation by ID:", error);
      throw error;
    }
  }

  async createReservation(
    data: CreateReservationDTO,
    staffUserId: string
  ): Promise<ReservationWithRelations> {
    try {
      // Check if table is available during requested time
      const existingReservations = await this.prisma.reservation.findMany({
        where: {
          tableId: data.tableId,
          status: {
            in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED],
          },
          OR: [
            // Overlapping start times
            {
              startTime: {
                lte: new Date(data.startTime),
              },
              AND: {
                startTime: {
                  gte: new Date(
                    new Date(data.startTime).getTime() -
                      data.duration * 60 * 1000
                  ),
                },
              },
            },
            // Reservation starts during existing reservation
            {
              startTime: {
                lte: new Date(
                  new Date(data.startTime).getTime() + data.duration * 60 * 1000
                ),
              },
              AND: {
                startTime: {
                  gte: new Date(data.startTime),
                },
              },
            },
          ],
        },
      });

      if (existingReservations.length > 0) {
        throw new Error("Table is already reserved for this time slot");
      }

      // Check for prayer times that might overlap with the reservation
      const startTime = new Date(data.startTime);
      const endTime = new Date(startTime.getTime() + data.duration * 60 * 1000);

      const overlappingPrayerTimes = await this.prisma.prayerTime.findMany({
        where: {
          OR: [
            // Prayer time starts during reservation
            {
              time: {
                gte: startTime,
                lte: endTime,
              },
            },
            // Reservation happens during prayer time
            {
              time: {
                lte: startTime,
              },
              AND: {
                time: {
                  gte: new Date(
                    startTime.getTime() - 30 * 60 * 1000 // 30 minutes is typical prayer duration
                  ),
                },
              },
            },
          ],
        },
      });

      if (overlappingPrayerTimes.length > 0) {
        throw new Error(
          "Cannot create reservation during prayer time. Please select another time."
        );
      }

      // Create the reservation
      const reservation = await this.prisma.reservation.create({
        data: {
          tableId: data.tableId,
          userId: data.userId,
          startTime: new Date(data.startTime),
          duration: data.duration,
          status: ReservationStatus.CONFIRMED,
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          customerEmail: data.customerEmail,
          numberOfPeople: data.numberOfPeople || 2,
          notes: data.notes,
        },
        include: {
          table: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Update the table status to RESERVED
      await this.prisma.poolTable.update({
        where: { id: data.tableId },
        data: { status: TableStatus.RESERVED },
      });

      // Log the activity
      await this.logActivity(
        staffUserId,
        "RESERVATION_CREATED",
        `Reservation created for table ${reservation.table.number} by ${reservation.customerName}`
      );

      // Broadcast the event
      this.broadcastEvent("RESERVATION_CREATED", reservation);

      return reservation;
    } catch (error) {
      logger.error("Error creating reservation:", error);
      throw error;
    }
  }

  async updateReservation(
    id: string,
    data: UpdateReservationDTO,
    userId: string
  ): Promise<ReservationWithRelations> {
    try {
      const reservation = await this.prisma.reservation.update({
        where: { id },
        data,
        include: {
          table: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // If status is changed to CANCELLED, update table status
      if (data.status === ReservationStatus.CANCELLED) {
        await this.prisma.poolTable.update({
          where: { id: reservation.tableId },
          data: { status: TableStatus.AVAILABLE },
        });
      }

      // Log the activity
      await this.logActivity(
        userId,
        "RESERVATION_UPDATED",
        `Reservation for table ${reservation.table.number} updated`
      );

      // Broadcast the event
      this.broadcastEvent("RESERVATION_UPDATED", reservation);

      return reservation;
    } catch (error) {
      logger.error("Error updating reservation:", error);
      throw error;
    }
  }

  async cancelReservation(
    id: string,
    userId: string
  ): Promise<ReservationWithRelations> {
    try {
      return await this.updateReservation(
        id,
        { status: ReservationStatus.CANCELLED },
        userId
      );
    } catch (error) {
      logger.error("Error cancelling reservation:", error);
      throw error;
    }
  }

  async completeReservation(
    id: string,
    userId: string
  ): Promise<ReservationWithRelations> {
    try {
      return await this.updateReservation(
        id,
        { status: ReservationStatus.COMPLETED },
        userId
      );
    } catch (error) {
      logger.error("Error completing reservation:", error);
      throw error;
    }
  }

  async getAvailableTimeSlots(
    date: Date,
    tableId?: string
  ): Promise<TableAvailability> {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // Get all reservations for the specified date
      const reservations = await this.prisma.reservation.findMany({
        where: {
          startTime: {
            gte: startOfDay,
            lt: endOfDay,
          },
          ...(tableId ? { tableId } : {}),
          status: {
            in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED],
          },
        },
        include: {
          table: true,
        },
      });

      // Get prayer times for the specified date
      const prayerTimes = await this.prisma.prayerTime.findMany({
        where: {
          time: {
            gte: startOfDay,
            lt: endOfDay,
          },
        },
      });

      // Get all tables (or the specific table if tableId is provided)
      const tables = tableId
        ? await this.prisma.poolTable.findMany({
            where: { id: tableId },
          })
        : await this.prisma.poolTable.findMany();

      // Generate time slots from 10 AM to 10 PM (12 hours), hourly intervals
      const timeSlots: Date[] = Array.from({ length: 13 }, (_, index) => {
        const slotTime = new Date(date);
        slotTime.setHours(10 + index, 0, 0, 0);
        return slotTime;
      });

      // For each table, determine availability for each time slot
      const availability: TableAvailability = {};

      tables.forEach((table) => {
        // Initialize the table entry
        availability[table.id] = {
          tableNumber: table.number,
          slots: {},
        };

        timeSlots.forEach((slotTime) => {
          const timeSlotKey = `${
            slotTime.getHours() > 12
              ? slotTime.getHours() - 12
              : slotTime.getHours()
          }:00 ${slotTime.getHours() >= 12 ? "PM" : "AM"}`;

          // Check if there are any reservations that overlap with this time slot
          const conflictingReservation = reservations.find((res) => {
            if (res.tableId !== table.id) return false;

            const resStart = new Date(res.startTime);
            const resEnd = new Date(
              new Date(res.startTime).getTime() + res.duration * 60 * 1000
            );

            return (
              (slotTime >= resStart && slotTime < resEnd) || // Time slot starts during reservation
              (new Date(slotTime.getTime() + 60 * 60 * 1000) > resStart &&
                new Date(slotTime.getTime() + 60 * 60 * 1000) <= resEnd) // Next hour is during reservation
            );
          });

          // Check if there are any prayer times that overlap with this time slot
          const conflictingPrayerTime = prayerTimes.find((prayer) => {
            const prayerStart = new Date(prayer.time);
            const prayerEnd = new Date(
              prayerStart.getTime() + prayer.durationMinutes * 60 * 1000
            );

            return (
              (slotTime >= prayerStart && slotTime < prayerEnd) || // Time slot starts during prayer
              (new Date(slotTime.getTime() + 60 * 60 * 1000) > prayerStart &&
                new Date(slotTime.getTime() + 60 * 60 * 1000) <= prayerEnd) // Next hour is during prayer
            );
          });

          if (availability[table.id]?.slots[timeSlotKey] === undefined) {
            logger.error(
              `Error getting available time slots: table ${table.id} not found in availability object`
            );
            throw new Error(
              `Table ${table.id} not found in availability object`
            );
          }

          // A slot is available if there are no conflicting reservations or prayer times
          // and the table is not in maintenance or prayer time status
          // availability[table.id].slots[timeSlotKey] =
          //   !conflictingReservation &&
          //   !conflictingPrayerTime &&
          //   table.status !== TableStatus.MAINTENANCE &&
          //   table.status !== TableStatus.PRAYER_TIME;
        });
      });

      return availability;
    } catch (error) {
      logger.error("Error getting available time slots:", error);
      throw error;
    }
  }

  async getUpcomingReservations(): Promise<ReservationWithRelations[]> {
    try {
      const now = new Date();

      return await this.prisma.reservation.findMany({
        where: {
          startTime: {
            gte: now,
          },
          status: ReservationStatus.CONFIRMED,
        },
        include: {
          table: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          startTime: "asc",
        },
        take: 10, // Limit to next 10 reservations
      });
    } catch (error) {
      logger.error("Error getting upcoming reservations:", error);
      throw error;
    }
  }
}
