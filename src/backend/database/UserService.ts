import Database from "better-sqlite3";
import { BaseService } from "./BaseService";
import { User, CreateUserDTO } from "@/shared/types/User";
import {
  DatabaseError,
  NotFoundError,
  BusinessError,
} from "@/shared/types/errors";
import Logger from "@/shared/logger";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

/**
 * UserService manages user accounts, including creation, authentication,
 * and role updates. It uses bcrypt for password hashing and jsonwebtoken for JWT generation.
 */
export class UserService extends BaseService {
  private jwtSecret: string;

  constructor(db: Database.Database, jwtSecret: string) {
    super(db);
    this.jwtSecret = jwtSecret;
    Logger.info("Initializing UserService");
    this.initializeTable();
  }

  /**
   * Creates the users table if it does not already exist.
   */
  private initializeTable(): void {
    try {
      Logger.info("Initializing users table schema if not exists");
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          email TEXT NOT NULL,
          passwordHash TEXT NOT NULL,
          role TEXT NOT NULL,
          isActive BOOLEAN NOT NULL DEFAULT 1,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      Logger.info("Users table schema initialized successfully");
    } catch (error) {
      Logger.error("Failed to initialize users table: " + error);
      throw new DatabaseError("Failed to initialize users table", { error });
    }
  }

  /**
   * Creates a new user account.
   *
   * @param data - The user creation details, including username, email, password, and role.
   * @returns The newly created User record (without the passwordHash field).
   * @throws DatabaseError if user creation fails.
   */
  async createUser(data: CreateUserDTO): Promise<User> {
    try {
      Logger.info(`Creating new user: ${data.username}`);
      // Hash the password before storing it.
      const hashedPassword = await bcrypt.hash(data.password, 10);
      const stmt = this.db.prepare(`
        INSERT INTO users (username, email, passwordHash, role)
        VALUES (?, ?, ?, ?)
      `);
      const result = stmt.run(
        data.username,
        data.email,
        hashedPassword,
        data.role
      );
      if (!result.lastInsertRowid) {
        Logger.error("Failed to create user: no lastInsertRowid returned");
        throw new DatabaseError("Failed to create user");
      }
      Logger.info(
        `User created successfully with id ${result.lastInsertRowid}`
      );
      return await this.getUserById(Number(result.lastInsertRowid));
    } catch (error) {
      Logger.error("Error creating user: " + error);
      throw new DatabaseError("Failed to create user", { error });
    }
  }

  /**
   * Retrieves a user by their unique identifier.
   *
   * @param id - The user's unique identifier.
   * @returns The User record without the passwordHash field.
   * @throws NotFoundError if the user is not found.
   */
  async getUserById(id: number): Promise<User> {
    try {
      Logger.info(`Fetching user with id ${id}`);
      const stmt = this.db.prepare("SELECT * FROM users WHERE id = ?");
      const user = stmt.get(id) as User | undefined;
      if (!user) {
        Logger.warn(`User with id ${id} not found`);
        throw new NotFoundError(`User with id ${id} not found`);
      }
      Logger.info(`User with id ${id} retrieved successfully`);
      // Remove the sensitive passwordHash field when returning user data.
      // const { passwordHash, ...safeUser } = user;
      return user;
    } catch (error) {
      Logger.error("Error fetching user: " + error);
      if (error instanceof NotFoundError) throw error;
      throw new DatabaseError("Failed to fetch user by id", { error });
    }
  }

  /**
   * Authenticates a user with the given credentials.
   *
   * @param username - The username of the user.
   * @param password - The plain text password to verify.
   * @returns A signed JWT token if authentication is successful.
   * @throws NotFoundError if the user is not found.
   * @throws BusinessError if the credentials are invalid.
   */
  async authenticate(username: string, password: string): Promise<string> {
    try {
      Logger.info(`Authenticating user ${username}`);
      const stmt = this.db.prepare("SELECT * FROM users WHERE username = ?");
      const user = stmt.get(username) as User | undefined;
      if (!user) {
        Logger.warn(`User ${username} not found`);
        throw new NotFoundError(`User ${username} not found`);
      }
      // Compare the provided password with the stored hashed password.
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        Logger.warn(`Invalid password for user ${username}`);
        throw new BusinessError("Invalid credentials");
      }
      // Sign a JWT token that includes the user's id and role.
      const token = jwt.sign({ id: user.id, role: user.role }, this.jwtSecret, {
        expiresIn: "1h",
      });
      Logger.info(`User ${username} authenticated successfully`);
      return token;
    } catch (error) {
      Logger.error("Error authenticating user: " + error);
      if (error instanceof NotFoundError || error instanceof BusinessError) {
        throw error;
      }
      throw new DatabaseError("Failed to authenticate user", { error });
    }
  }

  /**
   * Updates the role of a user.
   *
   * @param id - The user's unique identifier.
   * @param role - The new role to assign.
   * @returns The updated User record (without the passwordHash field).
   * @throws NotFoundError if the user is not found.
   */
  async updateUserRole(id: number, role: string): Promise<User> {
    try {
      Logger.info(`Updating role for user ${id} to ${role}`);
      const stmt = this.db.prepare(
        "UPDATE users SET role = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?"
      );
      const result = stmt.run(role, id);
      if (result.changes === 0) {
        Logger.warn(`User with id ${id} not found for role update`);
        throw new NotFoundError(`User with id ${id} not found`);
      }
      Logger.info(`User ${id} role updated successfully`);
      return await this.getUserById(id);
    } catch (error) {
      Logger.error("Error updating user role: " + error);
      throw new DatabaseError("Failed to update user role", { error });
    }
  }
}
