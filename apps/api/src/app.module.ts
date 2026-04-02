import { Module, MiddlewareConsumer, NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ClsModule } from "nestjs-cls";
import { z } from "zod";
import { HealthModule } from "./health/health.module";
import { AppController } from "./app.controller";
import { PrismaModule } from "./common/prisma/prisma.module";
import { RedisModule } from "./common/redis/redis.module";
import { QueueModule } from "./common/queue/queue.module";
import { AuthModule } from "./common/auth/auth.module";
import { RbacGuard } from "./common/auth/rbac.guard";
import { TenantMiddleware } from "./common/tenant/tenant.middleware";
import { TenantGuard } from "./common/tenant/tenant.guard";
import { LgpdModule } from "./modules/lgpd/lgpd.module";
import { TenantsModule } from "./modules/tenants/tenants.module";
import { UsersModule } from "./modules/users/users.module";
import { WhatsappModule } from "./modules/whatsapp/whatsapp.module";
import { AgentModule } from "./modules/agent/agent.module";
import { CrmModule } from "./modules/crm/crm.module";
import { SchedulingModule } from "./modules/scheduling/scheduling.module";

const envSchema = z.object({
  DATABASE_URL: z.string().url().optional(),
  REDIS_URL: z.string().url().optional(),
  BETTER_AUTH_SECRET: z.string().optional(),
  NEXT_PUBLIC_API_URL: z.string().url().optional(),
  WEB_URL: z.string().url().optional(),
  PORT: z.coerce.number().default(3001),
  PGCRYPTO_KEY: z.string().optional(),
  EVOLUTION_API_URL: z.string().url().optional(),
  EVOLUTION_API_KEY: z.string().optional(),
  WEBHOOK_BASE_URL: z.string().url().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().url().optional(),
});

function validateEnv(config: Record<string, unknown>) {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    console.warn(
      "Environment validation warnings:",
      result.error.flatten().fieldErrors,
    );
  }
  return config;
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    ClsModule.forRoot({
      middleware: { mount: false },
    }),
    PrismaModule,
    RedisModule,
    QueueModule,
    AuthModule,
    HealthModule,
    LgpdModule,
    TenantsModule,
    UsersModule,
    WhatsappModule,
    AgentModule,
    CrmModule,
    SchedulingModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: TenantGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RbacGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes("*");
  }
}
