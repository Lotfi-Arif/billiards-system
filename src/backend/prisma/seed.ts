import {
  PrismaClient,
  Role,
  TableStatus,
  SessionType,
  SessionStatus,
  ReservationStatus,
} from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  // Clear existing data
  await prisma.activityLog.deleteMany();
  await prisma.session.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.prayerTime.deleteMany();
  await prisma.user.deleteMany();
  await prisma.poolTable.deleteMany();

  // Create users
  const hashedPassword = await bcrypt.hash("password123", 10);

  const manager = await prisma.user.create({
    data: {
      name: "Manager",
      email: "manager@example.com",
      password: hashedPassword,
      role: Role.MANAGER,
    },
  });

  const staff = await prisma.user.create({
    data: {
      name: "Staff Member",
      email: "staff@example.com",
      password: hashedPassword,
      role: Role.STAFF,
    },
  });

  const customer = await prisma.user.create({
    data: {
      name: "Customer",
      email: "customer@example.com",
      password: hashedPassword,
      role: Role.CUSTOMER,
    },
  });

  // Create pool tables
  const tables = await Promise.all(
    Array.from({ length: 5 }, (_, i) => i + 1).map((number) =>
      prisma.poolTable.create({
        data: {
          number,
          status:
            number === 5 ? TableStatus.MAINTENANCE : TableStatus.AVAILABLE,
          isLightOn: false,
        },
      })
    )
  );

  // Create prayer times
  const prayerTimes = await Promise.all([
    prisma.prayerTime.create({
      data: {
        name: "Fajr",
        time: new Date("2025-02-17T05:30:00Z"),
        notificationTime: new Date("2025-02-17T05:20:00Z"),
        durationMinutes: 30,
      },
    }),
    prisma.prayerTime.create({
      data: {
        name: "Dhuhr",
        time: new Date("2025-02-17T12:30:00Z"),
        notificationTime: new Date("2025-02-17T12:20:00Z"),
        durationMinutes: 30,
      },
    }),
    prisma.prayerTime.create({
      data: {
        name: "Asr",
        time: new Date("2025-02-17T15:45:00Z"),
        notificationTime: new Date("2025-02-17T15:35:00Z"),
        durationMinutes: 30,
      },
    }),
    prisma.prayerTime.create({
      data: {
        name: "Maghrib",
        time: new Date("2025-02-17T18:15:00Z"),
        notificationTime: new Date("2025-02-17T18:05:00Z"),
        durationMinutes: 30,
      },
    }),
    prisma.prayerTime.create({
      data: {
        name: "Isha",
        time: new Date("2025-02-17T19:45:00Z"),
        notificationTime: new Date("2025-02-17T19:35:00Z"),
        durationMinutes: 30,
      },
    }),
  ]);

  // Create some active sessions
  const activeSession = await prisma.session.create({
    data: {
      tableId: tables[0].id,
      userId: customer.id,
      type: SessionType.TIMED,
      duration: 60,
      status: SessionStatus.ACTIVE,
      cost: 30.0,
    },
  });

  // Create some completed sessions
  const completedSession = await prisma.session.create({
    data: {
      tableId: tables[1].id,
      userId: customer.id,
      type: SessionType.OPEN,
      startTime: new Date("2025-02-17T10:00:00Z"),
      endTime: new Date("2025-02-17T11:30:00Z"),
      status: SessionStatus.COMPLETED,
      cost: 45.0,
    },
  });

  // Create some reservations
  const pendingReservation = await prisma.reservation.create({
    data: {
      tableId: tables[2].id,
      userId: customer.id,
      startTime: new Date("2025-02-17T20:00:00Z"),
      duration: 60,
      status: ReservationStatus.PENDING,
    },
  });

  const confirmedReservation = await prisma.reservation.create({
    data: {
      tableId: tables[3].id,
      userId: customer.id,
      startTime: new Date("2025-02-17T21:00:00Z"),
      duration: 120,
      status: ReservationStatus.CONFIRMED,
    },
  });

  // Create activity logs
  await Promise.all([
    prisma.activityLog.create({
      data: {
        userId: manager.id,
        action: "USER_LOGIN",
        details: "Manager logged in",
      },
    }),
    prisma.activityLog.create({
      data: {
        userId: staff.id,
        action: "SESSION_STARTED",
        details: `Started session for table ${tables[0].number}`,
      },
    }),
    prisma.activityLog.create({
      data: {
        userId: staff.id,
        action: "RESERVATION_CONFIRMED",
        details: `Confirmed reservation for table ${tables[3].number}`,
      },
    }),
  ]);

  console.log(`Database has been seeded. 🌱`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
