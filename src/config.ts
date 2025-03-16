export const config = {
  ws: {
    port: process.env.WS_PORT ? parseInt(process.env.WS_PORT, 10) : 8080,
  },
  mqtt: {
    broker: process.env.MQTT_BROKER || "mqtt://localhost:1883",
    options: {
      keepalive: 60,
      clientId: `billiards_system_${Math.random().toString(16).slice(3)}`,
      clean: true,
      reconnectPeriod: 5000,
    },
  },
  prisma: {
    logLevel: process.env.NODE_ENV === "development" ? "debug" : "error",
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET || "your-secret-key",
    jwtExpiry: "24h",
  },
} as const;

// Type for the config
export type Config = typeof config;
