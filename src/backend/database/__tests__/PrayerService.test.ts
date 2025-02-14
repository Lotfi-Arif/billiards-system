import { PrayerService } from "../PrayerService";
import { Prayer } from "@/shared/types/Prayer";

describe("PrayerService", () => {
  let prayerService: PrayerService;

  beforeEach(() => {
    prayerService = new PrayerService({
      coordinates: {
        latitude: 21.422487,
        longitude: 39.826206,
      },
      buffer: {
        before: 15,
        after: 15,
      },
    });
  });

  describe("getPrayerTimes", () => {
    it("should return prayer times for a given date", () => {
      const date = new Date("2024-02-10T12:00:00");
      const prayerTimes = prayerService.getPrayerTimes(date);
      expect(prayerTimes.fajr).toBeDefined();
      expect(prayerTimes.dhuhr).toBeDefined();
      expect(prayerTimes.asr).toBeDefined();
      expect(prayerTimes.maghrib).toBeDefined();
      expect(prayerTimes.isha).toBeDefined();
    });
  });

  describe("isInPrayerTime", () => {
    it("should return true during prayer time including buffer", async () => {
      const date = new Date("2024-02-10T12:00:00");
      const prayerTimes = prayerService.getPrayerTimes(date);

      // Use actual Dhuhr time
      const testTime = new Date(prayerTimes.dhuhr);
      const isInPrayer = await prayerService.isInPrayerTime(testTime);
      expect(isInPrayer).toBe(true);
    });

    it("should return false outside prayer times", async () => {
      const date = new Date("2024-02-10T12:00:00");
      const prayerTimes = prayerService.getPrayerTimes(date);

      // Set time to exactly between Dhuhr and Asr
      const testTime = new Date(
        (prayerTimes.dhuhr.getTime() + prayerTimes.asr.getTime()) / 2
      );
      const isInPrayer = await prayerService.isInPrayerTime(testTime);
      expect(isInPrayer).toBe(false);
    });
  });

  describe("getNextPrayer", () => {
    it("should return the next prayer time", async () => {
      const date = new Date("2024-02-10T12:00:00");
      const prayerTimes = prayerService.getPrayerTimes(date);

      // Use time just before Dhuhr
      const testTime = new Date(prayerTimes.dhuhr);
      testTime.setMinutes(testTime.getMinutes() - 30);

      const nextPrayer = await prayerService.getNextPrayer(testTime);
      expect(nextPrayer).toHaveProperty("name");
      expect(nextPrayer).toHaveProperty("time");
      expect(nextPrayer.time).toBeInstanceOf(Date);
      expect(nextPrayer.name).toBe(Prayer.Dhuhr);
    });

    it("should return next day Fajr if after Isha", async () => {
      const date = new Date("2024-02-10T12:00:00");
      const prayerTimes = prayerService.getPrayerTimes(date);

      // Use time after Isha
      const testTime = new Date(prayerTimes.isha);
      testTime.setHours(testTime.getHours() + 1);

      const nextPrayer = await prayerService.getNextPrayer(testTime);
      expect(nextPrayer.name).toBe(Prayer.Fajr);

      const tomorrow = new Date(testTime);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowPrayers = prayerService.getPrayerTimes(tomorrow);
      expect(nextPrayer.time).toEqual(tomorrowPrayers.fajr);
    });
  });

  describe("isValidBusinessHour", () => {
    it("should return false outside business hours", async () => {
      const testTime = new Date("2024-02-10T08:00:00");
      const isValid = await prayerService.isValidBusinessHour(testTime);
      expect(isValid).toBe(false);
    });

    it("should return false during prayer times", async () => {
      const date = new Date("2024-02-10T12:00:00");
      const prayerTimes = prayerService.getPrayerTimes(date);

      // Use actual Dhuhr time
      const testTime = new Date(prayerTimes.dhuhr);
      const isValid = await prayerService.isValidBusinessHour(testTime);
      expect(isValid).toBe(false);
    });

    it("should return true during valid business hours", async () => {
      const date = new Date("2024-02-10T12:00:00");
      const prayerTimes = prayerService.getPrayerTimes(date);

      // Use time between prayers during business hours
      const testTime = new Date(
        (prayerTimes.dhuhr.getTime() + prayerTimes.asr.getTime()) / 2
      );
      testTime.setHours(14); // Ensure it's during business hours

      const isValid = await prayerService.isValidBusinessHour(testTime);
      expect(isValid).toBe(true);
    });
  });

  describe("getNextAvailableTime", () => {
    it("should return same time if already valid", async () => {
      const date = new Date("2024-02-10T12:00:00");
      const prayerTimes = prayerService.getPrayerTimes(date);

      // Use time between prayers during business hours
      const testTime = new Date(
        (prayerTimes.dhuhr.getTime() + prayerTimes.asr.getTime()) / 2
      );
      testTime.setHours(14); // Ensure it's during business hours

      const nextTime = await prayerService.getNextAvailableTime(testTime);
      expect(nextTime.getTime()).toBe(testTime.getTime());
    });

    it("should return next day opening time if after hours", async () => {
      const testTime = new Date("2024-02-10T23:30:00");
      const nextTime = await prayerService.getNextAvailableTime(testTime);

      expect(nextTime.getHours()).toBe(9);
      expect(nextTime.getDate()).toBe(testTime.getDate() + 1);
    });

    it("should skip prayer times", async () => {
      const date = new Date("2024-02-10T12:00:00");
      const prayerTimes = prayerService.getPrayerTimes(date);

      // Use actual Dhuhr time
      const testTime = new Date(prayerTimes.dhuhr);
      const nextTime = await prayerService.getNextAvailableTime(testTime);

      expect(nextTime.getTime()).toBeGreaterThan(testTime.getTime());
      const isInPrayer = await prayerService.isInPrayerTime(nextTime);
      expect(isInPrayer).toBe(false);
    });
  });
});
