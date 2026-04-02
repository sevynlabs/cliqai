import { betterAuth } from "better-auth";
import { organization } from "better-auth/plugins";
import { createAccessControl } from "better-auth/plugins/access";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaClient } from "@prisma/client";

// Standalone Prisma client for Better Auth adapter
// (Not the NestJS PrismaService - Better Auth needs its own instance)
const prisma = new PrismaClient();

// Define access control resources and actions for CliniqAI
const ac = createAccessControl({
  clinic: ["manage", "view"],
  leads: ["create", "read", "update", "delete"],
  conversations: ["read", "respond", "manage"],
  settings: ["read", "write"],
  users: ["invite", "manage"],
});

// Role definitions with specific permission sets
const owner = ac.newRole({
  clinic: ["manage", "view"],
  leads: ["create", "read", "update", "delete"],
  conversations: ["read", "respond", "manage"],
  settings: ["read", "write"],
  users: ["invite", "manage"],
});

const admin = ac.newRole({
  clinic: ["view"],
  leads: ["create", "read", "update", "delete"],
  conversations: ["read", "respond", "manage"],
  settings: ["read", "write"],
  users: ["invite", "manage"],
});

const manager = ac.newRole({
  leads: ["create", "read", "update"],
  conversations: ["read", "respond", "manage"],
  settings: ["read"],
});

const attendant = ac.newRole({
  conversations: ["read", "respond"],
  leads: ["read"],
});

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  basePath: "/api/auth",
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Enable in production
    async sendResetPassword({ user, url }) {
      // In dev mode, log to console. Replace with nodemailer in production.
      console.log(`[DEV] Password reset link for ${user.email}: ${url}`);
    },
  },
  plugins: [
    organization({
      async sendInvitationEmail(data) {
        const inviteLink = `${process.env.WEB_URL || "http://localhost:3000"}/accept-invitation/${data.id}`;
        // In dev mode, log to console. Replace with nodemailer in production.
        console.log(
          `[DEV] Invitation for ${data.email} to org ${data.organization.id}: ${inviteLink}`,
        );
      },
      ac,
      roles: { owner, admin, manager, attendant },
    }),
  ],
  trustedOrigins: [process.env.WEB_URL || "http://localhost:3000"],
});

// Export types for use across the app
export type Auth = typeof auth;
export type Session = typeof auth.$Infer.Session;
export { ac };
