export default class Logger {
  static info(message: string, error?: Error | unknown): void {
    if (error instanceof Error) {
      console.info(
        `[INFO] ${new Date().toISOString()} - ${message}: ${error.message}`
      );
    } else {
      console.info(`[INFO] ${new Date().toISOString()} - ${message}`);
    }
  }

  static warn(message: string, error?: Error | unknown): void {
    if (error instanceof Error) {
      console.warn(
        `[WARN] ${new Date().toISOString()} - ${message}: ${error.message}`
      );
    } else {
      console.warn(`[WARN] ${new Date().toISOString()} - ${message}`);
    }
  }

  static error(message: string, error?: Error | unknown): void {
    if (error instanceof Error) {
      console.error(
        `[ERROR] ${new Date().toISOString()} - ${message}: ${error.message}`
      );
    } else {
      console.error(`[ERROR] ${new Date().toISOString()} - ${message}`);
    }
  }
}
