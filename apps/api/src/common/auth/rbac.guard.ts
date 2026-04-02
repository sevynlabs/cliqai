import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { hasMinRole, type CliniqRole } from "./roles";

export const MIN_ROLE_KEY = "minRole";

/**
 * Decorator to require a minimum organization role for a route.
 * Uses role hierarchy: owner > admin > manager > attendant.
 *
 * @example
 * @MinRole('manager') // owner, admin, and manager can access
 * @MinRole('owner')   // only owner can access
 */
export const MinRole = (role: CliniqRole) =>
  SetMetadata(MIN_ROLE_KEY, role);

/**
 * RBAC guard that checks if the user's organization role meets
 * the minimum role required for the endpoint.
 *
 * Works in conjunction with Better Auth's AuthGuard (which runs first
 * and attaches session to request). This guard reads the member role
 * from the session and compares against the @MinRole() decorator.
 *
 * If no @MinRole() is set, the guard passes (any authenticated user can access).
 */
@Injectable()
export class RbacGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const minRole = this.reflector.getAllAndOverride<CliniqRole | undefined>(
      MIN_ROLE_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No role requirement = any authenticated user can access
    if (!minRole) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const session = request.session;

    if (!session) {
      throw new ForbiddenException("No session found");
    }

    // The member role is attached by Better Auth's AuthGuard
    // when using the organization plugin. It's available as
    // session.session.activeOrganizationId paired with the member role.
    const memberRole =
      request.memberRole || session.user?.role || "attendant";

    if (!hasMinRole(memberRole, minRole)) {
      throw new ForbiddenException(
        `Insufficient permissions. Required: ${minRole}, your role: ${memberRole}`,
      );
    }

    return true;
  }
}
