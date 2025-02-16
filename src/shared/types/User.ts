import { Role } from "@prisma/client";

export interface UserCreateDTO {
  name: string;
  email: string;
  password: string;
  role: Role;
}

export interface UserUpdateDTO {
  name?: string;
  email?: string;
  password?: string;
  role?: Role;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: Role;
  };
}

export interface JWTPayload {
  userId: string;
  role: Role;
}
