import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class RecordConsentDto {
  @IsString()
  @IsNotEmpty()
  leadPhone!: string;

  @IsBoolean()
  consentGiven!: boolean;

  @IsString()
  @IsNotEmpty()
  consentVersion!: string;

  @IsString()
  @IsIn(["whatsapp", "web", "sms"])
  consentChannel!: string;

  @IsString()
  @IsNotEmpty()
  consentMessage!: string;

  @IsString()
  @IsOptional()
  ipAddress?: string;
}
