import { createAuthClient } from "better-auth/react";
import { organizationClient } from "better-auth/client/plugins";

const client = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001",
  plugins: [organizationClient()],
});

export const useSession = client.useSession;
export const signIn = client.signIn;
export const signUp = client.signUp;
export const signOut = client.signOut;
export const useActiveOrganization = client.useActiveOrganization;
export const organization = client.organization;

// Re-export full client for cases where direct access is needed
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const authClient = client as any;

export type Session = typeof client.$Infer.Session;
