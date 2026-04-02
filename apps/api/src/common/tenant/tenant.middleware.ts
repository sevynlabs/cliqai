import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { ClsService } from "nestjs-cls";
import { auth } from "../auth/auth.config";

/**
 * Extracts tenantId (activeOrganizationId) from the Better Auth session
 * and stores it in CLS context for downstream Prisma RLS queries.
 *
 * Skips tenant enforcement for public routes: /api/health, /api/auth/*
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly cls: ClsService) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    const path = req.path || req.url;

    // Skip tenant enforcement for public routes
    if (
      path === "/api/health" ||
      path === "/" ||
      path === "/api" ||
      path.startsWith("/api/auth")
    ) {
      return next();
    }

    try {
      // Resolve session from Better Auth using request headers (cookies)
      const session = await auth.api.getSession({
        headers: req.headers as any,
      });

      if (session?.session?.activeOrganizationId) {
        this.cls.set("tenantId", session.session.activeOrganizationId);
      }

      // Attach session to request for downstream guards and decorators
      (req as any).session = session;
      if (session?.user) {
        (req as any).user = session.user;
      }
    } catch {
      // Session resolution failed - let guards handle auth enforcement
    }

    next();
  }
}
