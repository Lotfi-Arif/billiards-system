import { z } from "zod";

export const UserSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(8),
  role: z.enum(["manager", "staff", "customer"]),
});

export const SessionSchema = z.object({
  tableId: z.number().positive(),
  staffId: z.number().positive(),
  customerId: z.number().positive().optional(),
  startTime: z.date(),
});

export const ReservationSchema = z.object({
  tableId: z.number().positive(),
  customerId: z.number().positive(),
  staffId: z.number().positive(),
  reservationTime: z.date(),
});
