import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { ClsService } from "nestjs-cls";

/**
 * Extracts tenantId from the request and stores it in CLS context.
 *
 * Currently reads from `x-tenant-id` header for development/testing.
 * Plan 03 will switch this to Better Auth session `activeOrganizationId`.
 *
 * Skips tenant enforcement for public routes: /api/health, /api/auth/*
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly cls: ClsService) {}

  use(req: Request, _res: Response, next: NextFunction) {
    const path = req.path || req.url;

    // Skip tenant enforcement for public routes
    if (path === "/api/health" || path.startsWith("/api/auth")) {
      return next();
    }

    const tenantId = req.headers["x-tenant-id"] as string | undefined;
    if (tenantId) {
      this.cls.set("tenantId", tenantId);
    }

    next();
  }
}
