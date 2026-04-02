import { Injectable, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }

  /**
   * Returns a Prisma client extension scoped to a specific tenant.
   * Every query is wrapped in a transaction that sets the PostgreSQL
   * session variable `app.current_tenant`, which RLS policies use
   * to filter rows by clinic_id.
   */
  forTenant(tenantId: string) {
    return this.$extends({
      query: {
        $allModels: {
          async $allOperations({ args, query }) {
            const [, result] = await (this as unknown as PrismaClient).$transaction([
              (this as unknown as PrismaClient).$executeRaw`SELECT set_config('app.current_tenant', ${tenantId}, TRUE)`,
              query(args),
            ]);
            return result;
          },
        },
      },
    });
  }
}
