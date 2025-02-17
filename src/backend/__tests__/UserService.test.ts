import { describe, it, expect, beforeEach, vi, Mock } from "vitest";
import { PrismaClient, Role, User } from "@prisma/client";
import { UserService } from "../UserService";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "@shared/__mocks__/prisma";

// Mock implementations need to be before any other code due to hoisting
vi.mock("../libs/prisma");

// Mock bcrypt
vi.mock("bcrypt", () => ({
  __esModule: true,
  default: {
    hash: vi.fn().mockResolvedValue("hashedPassword123"),
    compare: vi.fn().mockResolvedValue(true),
  },
}));

// Mock jwt
vi.mock("jsonwebtoken", () => {
  return {
    default: {
      sign: vi.fn().mockReturnValue("mock-jwt-token"),
      verify: vi.fn().mockReturnValue({ userId: "1", role: Role.STAFF }),
    },
  };
});

// Mock data
const mockUser: User = {
  id: "1",
  name: "Test User",
  email: "test@example.com",
  password: "hashedPassword123",
  role: Role.STAFF,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("UserService", () => {
  let userService: UserService;

  beforeEach(() => {
    userService = new UserService(prisma as unknown as PrismaClient);
    vi.clearAllMocks();
  });

  describe("createUser", () => {
    const createUserDTO = {
      name: "Test User",
      email: "test@example.com",
      password: "password123",
      role: Role.STAFF,
    };

    it("should create a new user successfully", async () => {
      prisma.user.findUnique.mockResolvedValueOnce(null);
      prisma.user.create.mockResolvedValueOnce(mockUser);

      const result = await userService.createUser(createUserDTO);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: createUserDTO.email },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(createUserDTO.password, 10);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          ...createUserDTO,
          password: "hashedPassword123",
        },
      });
      expect(prisma.activityLog.create).toHaveBeenCalledWith({
        data: {
          userId: mockUser.id,
          action: "USER_CREATED",
          details: `User ${mockUser.name} created`,
        },
      });
      expect(result).toEqual(mockUser);
    });

    it("should throw error if user already exists", async () => {
      prisma.user.findUnique.mockResolvedValueOnce(mockUser);

      await expect(userService.createUser(createUserDTO)).rejects.toThrow(
        "User with this email already exists"
      );
    });
  });

  describe("login", () => {
    const loginDTO = {
      email: "test@example.com",
      password: "password123",
    };

    it("should login user successfully", async () => {
      prisma.user.findUnique.mockResolvedValueOnce(mockUser);

      const result = await userService.login(loginDTO);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: loginDTO.email },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(
        loginDTO.password,
        mockUser.password
      );
      expect(jwt.sign).toHaveBeenCalledWith(
        {
          userId: mockUser.id,
          role: mockUser.role,
        },
        "your-secret-key",
        { expiresIn: "24h" }
      );
      expect(prisma.activityLog.create).toHaveBeenCalledWith({
        data: {
          userId: mockUser.id,
          action: "USER_LOGIN",
          details: `User ${mockUser.name} logged in`,
        },
      });
      expect(result).toEqual({
        token: "mock-jwt-token",
        user: {
          id: mockUser.id,
          name: mockUser.name,
          email: mockUser.email,
          role: mockUser.role,
        },
      });
    });

    it("should throw error if user not found", async () => {
      prisma.user.findUnique.mockResolvedValueOnce(null);

      await expect(userService.login(loginDTO)).rejects.toThrow(
        "Invalid email or password"
      );
    });

    it("should throw error if password is invalid", async () => {
      prisma.user.findUnique.mockResolvedValueOnce(mockUser);
      (bcrypt.compare as Mock).mockResolvedValueOnce(false);

      await expect(userService.login(loginDTO)).rejects.toThrow(
        "Invalid email or password"
      );
    });
  });

  describe("getUserById", () => {
    it("should return user by id", async () => {
      prisma.user.findUnique.mockResolvedValueOnce(mockUser);

      const result = await userService.getUserById(mockUser.id);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUser.id },
      });
      expect(result).toEqual(mockUser);
    });

    it("should return null if user not found", async () => {
      prisma.user.findUnique.mockResolvedValueOnce(null);

      const result = await userService.getUserById("nonexistent-id");

      expect(result).toBeNull();
    });
  });

  describe("getAllUsers", () => {
    it("should return all users", async () => {
      const users = [mockUser];
      prisma.user.findMany.mockResolvedValueOnce(users);

      const result = await userService.getAllUsers();

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: "desc" },
      });
      expect(result).toEqual(users);
    });
  });

  describe("updateUser", () => {
    const updateUserDTO = {
      name: "Updated Name",
      password: "hashedPassword123",
    };

    it("should update user successfully", async () => {
      const updatedUser = { ...mockUser, name: "Updated Name" };
      prisma.user.update.mockResolvedValueOnce(updatedUser);

      const result = await userService.updateUser(mockUser.id, updateUserDTO);

      expect(bcrypt.hash).toHaveBeenCalledWith(updateUserDTO.password, 10);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: {
          ...updateUserDTO,
          password: "hashedPassword123",
        },
      });
      expect(prisma.activityLog.create).toHaveBeenCalledWith({
        data: {
          userId: mockUser.id,
          action: "USER_UPDATED",
          details: `User ${updatedUser.name} updated`,
        },
      });
      expect(result).toEqual(updatedUser);
    });
  });

  describe("deleteUser", () => {
    it("should delete user successfully", async () => {
      prisma.user.findUnique.mockResolvedValueOnce(mockUser);

      await userService.deleteUser(mockUser.id);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUser.id },
      });
      expect(prisma.user.delete).toHaveBeenCalledWith({
        where: { id: mockUser.id },
      });
      expect(prisma.activityLog.create).toHaveBeenCalledWith({
        data: {
          userId: mockUser.id,
          action: "USER_DELETED",
          details: `User ${mockUser.name} deleted`,
        },
      });
    });

    it("should throw error if user not found", async () => {
      prisma.user.findUnique.mockResolvedValueOnce(null);

      await expect(userService.deleteUser("nonexistent-id")).rejects.toThrow(
        "User not found"
      );
    });
  });

  describe("getUsersByRole", () => {
    it("should return users by role", async () => {
      const users = [mockUser];
      prisma.user.findMany.mockResolvedValueOnce(users);

      const result = await userService.getUsersByRole(Role.STAFF);

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: { role: Role.STAFF },
        orderBy: { createdAt: "desc" },
      });
      expect(result).toEqual(users);
    });
  });

  describe("verifyToken", () => {
    it("should verify token successfully", () => {
      const result = userService.verifyToken("valid-token");

      expect(jwt.verify).toHaveBeenCalledWith("valid-token", "your-secret-key");
      expect(result).toEqual({ userId: "1", role: Role.STAFF });
    });

    it("should throw error for invalid token", () => {
      vi.mocked(jwt.verify).mockImplementationOnce(() => {
        throw new Error();
      });

      expect(() => userService.verifyToken("invalid-token")).toThrow(
        "Invalid token"
      );
    });
  });
});
