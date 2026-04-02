import {
  Body,
  Controller,
  Get,
  Param,
  Post,
} from "@nestjs/common";
import { ClsService } from "nestjs-cls";
import { LgpdService } from "./lgpd.service";
import { RecordConsentDto } from "./dto/record-consent.dto";
import { ErasureRequestDto } from "./dto/erasure-request.dto";

@Controller("api/lgpd")
export class LgpdController {
  constructor(
    private readonly lgpdService: LgpdService,
    private readonly cls: ClsService,
  ) {}

  @Post("consent")
  async recordConsent(@Body() dto: RecordConsentDto) {
    const clinicId = this.cls.get("tenantId");
    return this.lgpdService.recordConsent(clinicId, dto);
  }

  @Get("consent/:phone")
  async checkConsent(@Param("phone") phone: string) {
    const clinicId = this.cls.get("tenantId");
    const hasConsent = await this.lgpdService.hasConsent(clinicId, phone);
    return { hasConsent };
  }

  @Post("erasure")
  async requestErasure(@Body() dto: ErasureRequestDto) {
    const clinicId = this.cls.get("tenantId");
    return this.lgpdService.requestErasure(clinicId, dto.leadPhone);
  }
}
