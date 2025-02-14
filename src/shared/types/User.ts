export interface User {
  /** A unique identifier for the user */
  id: number;
  /** The username the user logs in with */
  username: string;
  /** The user’s email address */
  email: string;
  /** A hashed version of the user’s password */
  passwordHash: string;
  /** The role of the user in the system */
  role: UserRole;
  /** Flag to indicate if the user is active */
  isActive: boolean;
  /** Optional date of the last successful login */
  lastLogin?: Date;
  /** The date when the user was created */
  createdAt: Date;
  /** The date when the user was last updated */
  updatedAt: Date;
}

export enum UserRole {
  ADMIN = "ADMIN",
  MANAGER = "MANAGER",
  STAFF = "STAFF",
  CUSTOMER = "CUSTOMER",
}

/**
 * Data Transfer Object used when creating a new user.
 * The password provided here will be hashed before storing.
 */
export interface CreateUserDTO {
  username: string;
  email: string;
  password: string;
  /** Optionally, you can provide a role; otherwise a default role should be assigned */
  role?: UserRole;
}

/**
 * Data Transfer Object used when updating user details.
 * All fields are optional to allow partial updates.
 */
export interface UpdateUserDTO {
  email?: string;
  password?: string;
  role?: UserRole;
  isActive?: boolean;
}

/**
 * UserCredentials are used for the login process.
 */
export interface UserCredentials {
  username: string;
  password: string;
}
