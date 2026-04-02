import {
  IsString,
  IsOptional,
  IsBoolean,
  ValidateNested,
  IsObject,
} from "class-validator";
import { Type } from "class-transformer";

export class WebhookMessageKey {
  @IsString()
  remoteJid!: string;

  @IsBoolean()
  fromMe!: boolean;

  @IsString()
  id!: string;
}

export class ExtendedTextMessage {
  @IsString()
  @IsOptional()
  text?: string;
}

export class WebhookMessageContent {
  @IsString()
  @IsOptional()
  conversation?: string;

  @ValidateNested()
  @Type(() => ExtendedTextMessage)
  @IsOptional()
  extendedTextMessage?: ExtendedTextMessage;
}

export class WebhookQrCode {
  @IsString()
  base64!: string;
}

export class WebhookData {
  @ValidateNested()
  @Type(() => WebhookMessageKey)
  @IsOptional()
  key?: WebhookMessageKey;

  @ValidateNested()
  @Type(() => WebhookMessageContent)
  @IsOptional()
  message?: WebhookMessageContent;

  @IsString()
  @IsOptional()
  state?: string;

  @ValidateNested()
  @Type(() => WebhookQrCode)
  @IsOptional()
  qrcode?: WebhookQrCode;
}

export class EvolutionWebhookDto {
  @IsString()
  event!: string; // 'messages.upsert' | 'connection.update' | 'qrcode.updated'

  @IsString()
  instance!: string;

  @IsObject()
  @ValidateNested()
  @Type(() => WebhookData)
  data!: WebhookData;
}
