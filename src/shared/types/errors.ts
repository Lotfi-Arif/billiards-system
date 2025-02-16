export class ApplicationError extends Error {
  constructor(
    message: string,
    public code: string,
    public details: Record<string, unknown> = {}
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class DatabaseError extends ApplicationError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "DB_ERROR", details);
  }
}

export class ArduinoError extends ApplicationError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "ARDUINO_ERROR", details);
  }
}

export class ValidationError extends ApplicationError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "VALIDATION_ERROR", details);
  }
}

export class NotFoundError extends ApplicationError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "NOT_FOUND", details);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, NotFoundError.prototype);
    this.code = "NOT_FOUND";
  }
}

export class PermissionError extends ApplicationError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "PERMISSION_ERROR", details);
  }
}

export class BusinessError extends ApplicationError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "BUSINESS_ERROR", details);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, BusinessError.prototype);
  }
}

export class AuthenticationError extends ApplicationError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "AUTHENTICATION_ERROR", details);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}
