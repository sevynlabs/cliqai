/**
 * CliniqAI role definitions and hierarchy.
 *
 * These map to Better Auth organization member roles configured in auth.config.ts.
 * The @OrgRoles() decorator from @thallesp/nestjs-better-auth checks these.
 */

/** All CliniqAI roles in descending privilege order */
export const CLINIQ_ROLES = ["owner", "admin", "manager", "attendant"] as const;
export type CliniqRole = (typeof CLINIQ_ROLES)[number];

/**
 * Role hierarchy: higher index = higher privilege.
 * Used for "at least this role" checks.
 */
export const ROLE_HIERARCHY: Record<CliniqRole, number> = {
  attendant: 0,
  manager: 1,
  admin: 2,
  owner: 3,
};

/**
 * Check if a role meets or exceeds the minimum required role.
 *
 * @example
 * hasMinRole('owner', 'manager') // true
 * hasMinRole('attendant', 'manager') // false
 */
export function hasMinRole(
  userRole: string,
  minRole: CliniqRole,
): boolean {
  const userLevel = ROLE_HIERARCHY[userRole as CliniqRole];
  const minLevel = ROLE_HIERARCHY[minRole];
  if (userLevel === undefined || minLevel === undefined) return false;
  return userLevel >= minLevel;
}
