import { Module, forwardRef } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { FollowupsService } from "./followups.service";
import { FollowupsProcessor } from "./followups.processor";
import { WhatsappModule } from "../whatsapp/whatsapp.module";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [
    BullModule.registerQueue({ name: "followups" }),
    forwardRef(() => WhatsappModule),
    NotificationsModule,
  ],
  providers: [FollowupsService, FollowupsProcessor],
  exports: [FollowupsService],
})
export class FollowupsModule {}
