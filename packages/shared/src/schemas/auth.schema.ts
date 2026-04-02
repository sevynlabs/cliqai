import { z } from "zod";

/** Email/password login validation */
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

/** Signup validation (creates user + clinic) */
export const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  clinicName: z.string().min(2, "Clinic name must be at least 2 characters"),
});

/** User invitation validation */
export const inviteUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["owner", "admin", "manager", "attendant"]),
});

// Type inference available via z.infer<typeof loginSchema> etc.
// Canonical type exports are in types/auth.ts to avoid duplicate declarations.
