// src/backend/database/initDatabase.ts
import Database from "better-sqlite3";
import path from "path";
import fs from "fs-extra";
import Logger from "@/shared/logger";

export function initializeDatabase(dbPath: string): Database.Database {
  try {
    Logger.info(`Initializing database at: ${dbPath}`);

    // Ensure directory exists
    fs.ensureDirSync(path.dirname(dbPath));

    // Create database connection
    const db = new Database(dbPath, {
      verbose: process.env.NODE_ENV === "development" ? console.log : undefined,
    });

    // Enable foreign keys and WAL mode
    db.pragma("foreign_keys = ON");
    db.pragma("journal_mode = WAL");

    Logger.info("Database initialized successfully");
    return db;
  } catch (error) {
    Logger.error("Failed to initialize database:", error);
    throw error;
  }
}
