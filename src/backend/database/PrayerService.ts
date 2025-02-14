import { Prayer, PrayerConfig } from "@/shared/types/Prayer";
import { Coordinates, CalculationMethod, PrayerTimes } from "adhan";
import Logger from "@/shared/logger"; // Adjust the path as necessary

/**
 * PrayerService is responsible for calculating prayer times,
 * checking if a given time falls within prayer time windows (including configurable buffers),
 * determining the next prayer time, and finding the next available business time.
 */
export class PrayerService {
  private coordinates: Coordinates;
  private buffer: { before: number; after: number };

  /**
   * Creates an instance of PrayerService.
   * @param config - Optional configuration for coordinates and buffer times.
   */
  constructor(config?: PrayerConfig) {
    Logger.info("Initializing PrayerService");
    // Default to Mecca coordinates if none provided
    this.coordinates = new Coordinates(
      config?.coordinates.latitude ?? 21.422487,
      config?.coordinates.longitude ?? 39.826206
    );

    // Default buffer times: 15 minutes before and after prayer times
    this.buffer = {
      before: config?.buffer.before ?? 15,
      after: config?.buffer.after ?? 15,
    };
    Logger.info(
      `PrayerService configured with coordinates (${this.coordinates.latitude}, ${this.coordinates.longitude}) and buffer times (before: ${this.buffer.before} mins, after: ${this.buffer.after} mins)`
    );
  }

  /**
   * Calculates prayer times for a given date using the UmmAlQura calculation method.
   * @param date - The date for which to calculate prayer times.
   * @returns The PrayerTimes object containing times for Fajr, Dhuhr, Asr, Maghrib, and Isha.
   */
  getPrayerTimes(date: Date): PrayerTimes {
    try {
      Logger.info(`Calculating prayer times for date: ${date.toISOString()}`);
      const prayerTimes = new PrayerTimes(
        this.coordinates,
        date,
        CalculationMethod.UmmAlQura()
      );
      Logger.info("Prayer times calculated successfully");
      return prayerTimes;
    } catch (error) {
      Logger.error("Error calculating prayer times: " + error);
      throw error;
    }
  }

  /**
   * Checks whether the specified date falls within any prayer time window,
   * accounting for buffer times before and after each prayer.
   * @param date - The date/time to check.
   * @returns True if the date is within a prayer time window; otherwise, false.
   */
  async isInPrayerTime(date: Date): Promise<boolean> {
    try {
      Logger.info(`Checking if ${date.toISOString()} is during a prayer time`);
      const prayerTimes = this.getPrayerTimes(date);
      const prayers = [
        prayerTimes.fajr,
        prayerTimes.dhuhr,
        prayerTimes.asr,
        prayerTimes.maghrib,
        prayerTimes.isha,
      ];

      for (const prayerTime of prayers) {
        const prayerStart = new Date(prayerTime);
        prayerStart.setMinutes(prayerStart.getMinutes() - this.buffer.before);

        const prayerEnd = new Date(prayerTime);
        prayerEnd.setMinutes(prayerEnd.getMinutes() + this.buffer.after);

        Logger.info(
          `Prayer window: ${prayerStart.toISOString()} - ${prayerEnd.toISOString()}`
        );

        if (date >= prayerStart && date <= prayerEnd) {
          Logger.info("Time falls within a prayer window");
          return true;
        }
      }

      Logger.info("Time does not fall within any prayer window");
      return false;
    } catch (error) {
      Logger.error("Error in isInPrayerTime: " + error);
      throw error;
    }
  }

  /**
   * Determines the next prayer time after a given date.
   * If the provided time is very early (e.g. before 5 AM) and after yesterday’s Isha,
   * it rolls over to tomorrow’s Fajr.
   * @param date - The date/time from which to determine the next prayer (defaults to now).
   * @returns An object containing the name of the next prayer and its corresponding time.
   */
  async getNextPrayer(
    date: Date = new Date()
  ): Promise<{ name: Prayer; time: Date }> {
    try {
      Logger.info(`Calculating next prayer from ${date.toISOString()}`);
      const currentPrayerTimes = this.getPrayerTimes(date);
      const prayers = [
        { name: Prayer.Fajr, time: currentPrayerTimes.fajr },
        { name: Prayer.Dhuhr, time: currentPrayerTimes.dhuhr },
        { name: Prayer.Asr, time: currentPrayerTimes.asr },
        { name: Prayer.Maghrib, time: currentPrayerTimes.maghrib },
        { name: Prayer.Isha, time: currentPrayerTimes.isha },
      ].sort((a, b) => a.time.getTime() - b.time.getTime());

      let nextPrayer = prayers.find((prayer) => prayer.time > date);

      if (nextPrayer) {
        Logger.info(
          `Next prayer found: ${
            nextPrayer.name
          } at ${nextPrayer.time.toISOString()}`
        );
      } else {
        Logger.info("No upcoming prayer found for the current day");
      }

      // If it's early morning and we are in the period after yesterday's Isha, roll over to tomorrow's Fajr.
      if (
        nextPrayer &&
        nextPrayer.name === Prayer.Fajr &&
        date.getHours() < 5
      ) {
        Logger.info(
          "Time is before 5AM; checking if current time is after yesterday's Isha"
        );
        const yesterday = new Date(date);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayPrayerTimes = this.getPrayerTimes(yesterday);
        if (date > yesterdayPrayerTimes.isha) {
          Logger.info(
            "Current time is after yesterday's Isha; rolling over to tomorrow's Fajr"
          );
          const tomorrow = new Date(date);
          tomorrow.setDate(tomorrow.getDate() + 1);
          const tomorrowPrayerTimes = this.getPrayerTimes(tomorrow);
          return { name: Prayer.Fajr, time: tomorrowPrayerTimes.fajr };
        }
      }

      if (nextPrayer) {
        return nextPrayer;
      }

      Logger.info("Fallback: Returning tomorrow's Fajr prayer");
      const tomorrow = new Date(date);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const tomorrowPrayerTimes = this.getPrayerTimes(tomorrow);
      return { name: Prayer.Fajr, time: tomorrowPrayerTimes.fajr };
    } catch (error) {
      Logger.error("Error in getNextPrayer: " + error);
      throw error;
    }
  }

  /**
   * Returns an array of prayer time windows for the specified date.
   * Each window includes a start time (prayer time minus buffer) and an end time (prayer time plus buffer).
   * @param date - The date for which to compute prayer windows.
   * @returns An array of objects with start and end Date properties.
   */
  async getPrayerWindows(
    date: Date
  ): Promise<Array<{ start: Date; end: Date }>> {
    try {
      Logger.info(`Calculating prayer windows for ${date.toISOString()}`);
      const prayerTimes = this.getPrayerTimes(date);
      const prayers = [
        prayerTimes.fajr,
        prayerTimes.dhuhr,
        prayerTimes.asr,
        prayerTimes.maghrib,
        prayerTimes.isha,
      ];

      const windows = prayers.map((prayerTime) => {
        const start = new Date(prayerTime);
        start.setMinutes(start.getMinutes() - this.buffer.before);

        const end = new Date(prayerTime);
        end.setMinutes(end.getMinutes() + this.buffer.after);

        Logger.info(
          `Prayer window: ${start.toISOString()} - ${end.toISOString()}`
        );
        return { start, end };
      });

      return windows;
    } catch (error) {
      Logger.error("Error in getPrayerWindows: " + error);
      throw error;
    }
  }

  /**
   * Determines whether a given time is within valid business hours.
   * Business hours are defined as 9 AM to 11 PM, and the time must not fall within any prayer window.
   * @param date - The date/time to validate.
   * @returns True if the time is valid for business; otherwise, false.
   */
  async isValidBusinessHour(date: Date): Promise<boolean> {
    try {
      Logger.info(`Validating business hours for ${date.toISOString()}`);
      const hour = date.getHours();
      if (hour < 9 || hour >= 23) {
        Logger.info("Time is outside business hours (9 AM to 11 PM)");
        return false;
      }
      const inPrayerTime = await this.isInPrayerTime(date);
      if (inPrayerTime) {
        Logger.info("Time falls during prayer time; not valid for business");
        return false;
      }
      Logger.info("Time is within valid business hours");
      return true;
    } catch (error) {
      Logger.error("Error in isValidBusinessHour: " + error);
      throw error;
    }
  }

  /**
   * Computes the next available time that falls within valid business hours.
   * If the provided time is outside business hours or during a prayer window,
   * it advances to the next valid time.
   * @param date - The starting date/time (defaults to now).
   * @returns The next available Date that is valid for business.
   */
  async getNextAvailableTime(date: Date = new Date()): Promise<Date> {
    try {
      Logger.info(
        `Calculating next available time starting from ${date.toISOString()}`
      );
      let checkTime = new Date(date);

      // Loop until a valid business hour is found.
      while (!(await this.isValidBusinessHour(checkTime))) {
        Logger.info(
          `Time ${checkTime.toISOString()} is not within valid business hours`
        );

        // If the time is outside business hours, move to the next day at 9 AM.
        if (checkTime.getHours() < 9 || checkTime.getHours() >= 23) {
          Logger.info(
            "Time is outside business hours; moving to next day at 9 AM"
          );
          checkTime.setDate(checkTime.getDate() + 1);
          checkTime.setHours(9, 0, 0, 0);
          continue;
        }

        // If within business hours but during prayer time, advance to just after the prayer window.
        const prayerWindows = await this.getPrayerWindows(checkTime);
        const currentPrayerWindow = prayerWindows.find(
          (window) => checkTime >= window.start && checkTime <= window.end
        );

        if (currentPrayerWindow) {
          Logger.info(
            `Time ${checkTime.toISOString()} falls during a prayer window; advancing to after window end ${currentPrayerWindow.end.toISOString()}`
          );
          checkTime = new Date(currentPrayerWindow.end);
          // Advance one minute to avoid edge-case overlap.
          checkTime.setMinutes(checkTime.getMinutes() + 1);
        }
      }

      Logger.info(`Next available business time is ${checkTime.toISOString()}`);
      return checkTime;
    } catch (error) {
      Logger.error("Error in getNextAvailableTime: " + error);
      throw error;
    }
  }

  /**
   * Checks if any part of the interval [start, end] overlaps with a prayer window.
   * @param start The start time of the interval.
   * @param end The end time of the interval.
   * @returns True if there is an overlap; otherwise, false.
   */
  async isDuringPrayerTimeInterval(start: Date, end: Date): Promise<boolean> {
    try {
      Logger.info(
        `Checking for prayer time conflict between ${start.toISOString()} and ${end.toISOString()}`
      );
      // For simplicity, we check each minute in the interval.
      // (Alternatively, you could compute the prayer windows and check for overlap.)
      const intervalMinutes = Math.ceil(
        (end.getTime() - start.getTime()) / (1000 * 60)
      );
      for (let i = 0; i <= intervalMinutes; i++) {
        const checkTime = new Date(start.getTime() + i * 60 * 1000);
        if (await this.isInPrayerTime(checkTime)) {
          Logger.info(`Conflict found at ${checkTime.toISOString()}`);
          return true;
        }
      }
      Logger.info("No prayer time conflict found for the interval");
      return false;
    } catch (error) {
      Logger.error("Error in isDuringPrayerTimeInterval: " + error);
      throw error;
    }
  }
}
