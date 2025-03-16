import { PrismaClient, ReservationStatus, TableStatus } from "@prisma/client";
import { BaseService } from "./BaseService";
import {
  CreateReservationDTO,
  ReservationWithRelations,
  TableAvailability,
  UpdateReservationDTO,
} from "@shared/types/Reservation";
import { WebSocketServer } from "ws";
import logger from "@/shared/logger";

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

      // Get tables, reservations, and prayer times in parallel
      const [tables, reservations, prayerTimes] = await Promise.all([
        // Get tables (filtered if tableId is provided)
        this.prisma.poolTable.findMany({
          where: tableId ? { id: tableId } : undefined,
        }),

        // Get active reservations for the day
        this.prisma.reservation.findMany({
          where: {
            startTime: { gte: startOfDay, lt: endOfDay },
            ...(tableId ? { tableId } : {}),
            status: {
              in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED],
            },
          },
        }),

        // Get prayer times for the day
        this.prisma.prayerTime.findMany({
          where: {
            time: { gte: startOfDay, lt: endOfDay },
          },
        }),
      ]);

      // Generate hourly time slots from 10 AM to 10 PM
      const timeSlots = Array.from({ length: 13 }, (_, i) => {
        const slot = new Date(date);
        slot.setHours(10 + i, 0, 0, 0);
        return slot;
      });

      // Helper function to format time slot keys (e.g., "10:00 AM")
      const formatTimeSlot = (time: Date): string => {
        const hour = time.getHours();
        return `${hour > 12 ? hour - 12 : hour}:00 ${hour >= 12 ? "PM" : "AM"}`;
      };

      // Helper function to check if a time slot conflicts with a reservation
      const conflictsWithReservation = (
        tableId: string,
        slotTime: Date
      ): boolean => {
        const slotEnd = new Date(slotTime.getTime() + 60 * 60 * 1000); // 1 hour later

        return reservations.some((res) => {
          if (res.tableId !== tableId) return false;

          const resStart = new Date(res.startTime);
          const resEnd = new Date(
            resStart.getTime() + res.duration * 60 * 1000
          );

          return (
            (slotTime >= resStart && slotTime < resEnd) || // Slot starts during reservation
            (slotEnd > resStart && slotEnd <= resEnd) || // Slot ends during reservation
            (slotTime <= resStart && slotEnd >= resEnd) // Reservation contained within slot
          );
        });
      };

      // Helper function to check if a time slot conflicts with prayer time
      const conflictsWithPrayer = (slotTime: Date): boolean => {
        const slotEnd = new Date(slotTime.getTime() + 60 * 60 * 1000); // 1 hour later

        return prayerTimes.some((prayer) => {
          const prayerStart = new Date(prayer.time);
          const prayerEnd = new Date(
            prayerStart.getTime() + prayer.durationMinutes * 60 * 1000
          );

          return (
            (slotTime >= prayerStart && slotTime < prayerEnd) || // Slot starts during prayer
            (slotEnd > prayerStart && slotEnd <= prayerEnd) || // Slot ends during prayer
            (slotTime <= prayerStart && slotEnd >= prayerEnd) // Prayer contained within slot
          );
        });
      };

      // Build the availability object
      const availability: TableAvailability = tables.reduce((acc, table) => {
        // Initialize the table entry with all time slots
        const slots = timeSlots.reduce((slotMap, slotTime) => {
          const timeSlotKey = formatTimeSlot(slotTime);

          // A slot is available if:
          // 1. No conflicting reservations
          // 2. No conflicting prayer times
          // 3. Table is not in maintenance or prayer time status
          const isAvailable =
            !conflictsWithReservation(table.id, slotTime) &&
            !conflictsWithPrayer(slotTime) &&
            table.status !== TableStatus.MAINTENANCE &&
            table.status !== TableStatus.PRAYER_TIME;

          slotMap[timeSlotKey] = isAvailable;
          return slotMap;
        }, {} as Record<string, boolean>);

        acc[table.id] = {
          tableNumber: table.number,
          slots,
        };

        return acc;
      }, {} as TableAvailability);

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
