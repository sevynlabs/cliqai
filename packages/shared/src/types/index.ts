export enum UserRole {
  OWNER = "OWNER",
  ADMIN = "ADMIN",
  MANAGER = "MANAGER",
  ATTENDANT = "ATTENDANT",
}

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Clinic extends BaseEntity {
  name: string;
  slug: string;
}

export interface User extends BaseEntity {
  email: string;
  name: string;
  role: UserRole;
  clinicId: string;
}
