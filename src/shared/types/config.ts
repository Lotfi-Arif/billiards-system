export interface DatabaseConfig {
  filename: string;
  memory?: boolean;
}

export interface ArduinoConfig {
  baudRate: number;
  autoConnect: boolean;
}

export interface PrayerConfig {
  latitude: number;
  longitude: number;
  timeZone: string;
}
