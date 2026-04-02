import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ClsService } from "nestjs-cls";

export const IS_PUBLIC_KEY = "isPublic";

/**
 * Global guard that ensures a tenantId is present in CLS context
 * for all protected routes. Routes decorated with @Public() are exempt.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private readonly cls: ClsService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    // Check for @Public() decorator
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const tenantId = this.cls.get("tenantId");
    if (!tenantId) {
      throw new UnauthorizedException(
        "No active tenant (clinic) in request context",
      );
    }

    return true;
  }
}
