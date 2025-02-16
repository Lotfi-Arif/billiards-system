import { PrismaClient, Role, User } from "@prisma/client";
import { BaseService } from "./BaseService";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {
  UserCreateDTO,
  UserUpdateDTO,
  LoginDTO,
  AuthResponse,
  JWTPayload,
} from "@/shared/types/User";

export class UserService extends BaseService {
  private readonly JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
  private readonly SALT_ROUNDS = 10;

  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  async createUser(data: UserCreateDTO): Promise<User> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    const hashedPassword = await bcrypt.hash(data.password, this.SALT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
      },
    });

    await this.logActivity(
      user.id,
      "USER_CREATED",
      `User ${user.name} created`
    );
    return user;
  }

  async login(data: LoginDTO): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new Error("Invalid email or password");
    }

    const isValidPassword = await bcrypt.compare(data.password, user.password);

    if (!isValidPassword) {
      throw new Error("Invalid email or password");
    }

    const token = this.generateToken(user);

    await this.logActivity(
      user.id,
      "USER_LOGIN",
      `User ${user.name} logged in`
    );

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  async updateUser(userId: string, data: UserUpdateDTO): Promise<User> {
    if (data.password) {
      data.password = await bcrypt.hash(data.password, this.SALT_ROUNDS);
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data,
    });

    await this.logActivity(userId, "USER_UPDATED", `User ${user.name} updated`);
    return user;
  }

  async deleteUser(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    await this.prisma.user.delete({
      where: { id: userId },
    });

    await this.logActivity(userId, "USER_DELETED", `User ${user.name} deleted`);
  }

  async getUserById(userId: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
    });
  }

  async getAllUsers(): Promise<User[]> {
    return this.prisma.user.findMany({
      orderBy: { createdAt: "desc" },
    });
  }

  async getUsersByRole(role: Role): Promise<User[]> {
    return this.prisma.user.findMany({
      where: { role },
      orderBy: { createdAt: "desc" },
    });
  }

  private generateToken(user: User): string {
    const payload: JWTPayload = {
      userId: user.id,
      role: user.role,
    };

    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: "24h",
    });
  }

  verifyToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, this.JWT_SECRET) as JWTPayload;
    } catch (error) {
      throw new Error("Invalid token");
    }
  }
}
