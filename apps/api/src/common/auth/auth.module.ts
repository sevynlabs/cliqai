import { Module } from "@nestjs/common";
import { AuthModule as BetterAuthModule } from "@thallesp/nestjs-better-auth";
import { auth } from "./auth.config";

/**
 * Auth module that registers Better Auth with NestJS.
 *
 * This module:
 * - Mounts Better Auth handler on /api/auth/* routes
 * - Provides a global AuthGuard that validates sessions
 * - Exports @Session() decorator for extracting user session
 * - Provides AuthService for accessing auth.api programmatically
 *
 * The global AuthGuard is enabled by default. Use @AllowAnonymous() or
 * @Public() to skip auth on specific routes.
 */
@Module({
  imports: [
    BetterAuthModule.forRoot({
      auth,
      isGlobal: true,
    }),
  ],
})
export class AuthModule {}
