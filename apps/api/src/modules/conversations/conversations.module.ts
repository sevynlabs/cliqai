import { Module } from "@nestjs/common";
import { ConversationsController } from "./conversations.controller";
import { AgentModule } from "../agent/agent.module";

@Module({
  imports: [AgentModule],
  controllers: [ConversationsController],
})
export class ConversationsModule {}
