import { createParamDecorator, ExecutionContext } from "@nestjs/common";

/**
 * The authenticated user extracted from Better Auth session.
 */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  image?: string | null;
  activeOrganizationId?: string | null;
}

/**
 * Parameter decorator that extracts the current authenticated user
 * from the request. Requires the AuthGuard to have run first
 * (which is automatic when using @thallesp/nestjs-better-auth global guard).
 *
 * @example
 * @Get('profile')
 * getProfile(@CurrentUser() user: AuthUser) {
 *   return user;
 * }
 *
 * @Get('email')
 * getEmail(@CurrentUser('email') email: string) {
 *   return email;
 * }
 */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const session = request.session;

    if (!session?.user) {
      return null;
    }

    const user: AuthUser = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      image: session.user.image,
      activeOrganizationId: session.session?.activeOrganizationId,
    };

    return data ? user[data] : user;
  },
);
