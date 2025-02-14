export enum Prayer {
  Fajr = "fajr",
  Sunrise = "sunrise",
  Dhuhr = "dhuhr",
  Asr = "asr",
  Sunset = "sunset",
  Maghrib = "maghrib",
  Isha = "isha",
  None = "none",
}

export interface PrayerConfig {
  coordinates: {
    latitude: number;
    longitude: number;
  };
  // Buffer time in minutes before and after prayer
  buffer: {
    before: number;
    after: number;
  };
}
