import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { z } from "zod";
import { HealthModule } from "./health/health.module";
import { AppController } from "./app.controller";

const envSchema = z.object({
  DATABASE_URL: z.string().url().optional(),
  REDIS_URL: z.string().url().optional(),
  BETTER_AUTH_SECRET: z.string().optional(),
  NEXT_PUBLIC_API_URL: z.string().url().optional(),
  WEB_URL: z.string().url().optional(),
  PORT: z.coerce.number().default(3001),
  PGCRYPTO_KEY: z.string().optional(),
});

function validateEnv(config: Record<string, unknown>) {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    console.warn("Environment validation warnings:", result.error.flatten().fieldErrors);
  }
  return config;
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    HealthModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
