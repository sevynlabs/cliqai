import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { ConfigService } from "@nestjs/config";

@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: new URL(
            configService.get<string>("REDIS_URL", "redis://localhost:6380"),
          ).hostname,
          port: Number.parseInt(
            new URL(
              configService.get<string>("REDIS_URL", "redis://localhost:6380"),
            ).port || "6379",
            10,
          ),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue(
      { name: "whatsapp.inbound" },
      { name: "whatsapp.outbound" },
      { name: "notifications" },
    ),
  ],
  exports: [BullModule],
})
export class QueueModule {}
