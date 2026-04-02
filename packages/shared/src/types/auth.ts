/**
 * CliniqAI authentication and authorization types.
 * Shared between frontend and backend.
 */

/** Organization-level roles in CliniqAI */
export type CliniqRole = "owner" | "admin" | "manager" | "attendant";

/** All available roles */
export const CLINIQ_ROLES: CliniqRole[] = [
  "owner",
  "admin",
  "manager",
  "attendant",
];

/** Input for email/password login */
export interface LoginInput {
  email: string;
  password: string;
}

/** Input for signup (creates user + clinic/organization) */
export interface SignupInput {
  email: string;
  password: string;
  name: string;
  clinicName: string;
}

/** Input for inviting a user to a clinic */
export interface InviteUserInput {
  email: string;
  role: CliniqRole;
}

/** Authenticated user profile */
export interface AuthUserProfile {
  id: string;
  email: string;
  name: string;
  image?: string | null;
  activeOrganizationId?: string | null;
}

/** Permission resource types */
export type PermissionResource =
  | "clinic"
  | "leads"
  | "conversations"
  | "settings"
  | "users";

/** Permission action types */
export type PermissionAction =
  | "create"
  | "read"
  | "update"
  | "delete"
  | "manage"
  | "view"
  | "respond"
  | "write"
  | "invite";
