import { SetMetadata } from "@nestjs/common";
import { IS_PUBLIC_KEY } from "./tenant.guard";

/**
 * Decorator to mark a route as public (no tenant context required).
 * Used for health checks, auth endpoints, etc.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
