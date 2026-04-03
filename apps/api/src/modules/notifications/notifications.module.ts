import { Module, forwardRef } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { NotificationsService } from "./notifications.service";
import { NotificationsProcessor } from "./notifications.processor";
import { WhatsappModule } from "../whatsapp/whatsapp.module";

@Module({
  imports: [
    BullModule.registerQueue({ name: "notifications" }),
    forwardRef(() => WhatsappModule),
  ],
  providers: [NotificationsService, NotificationsProcessor],
  exports: [NotificationsService],
})
export class NotificationsModule {}
