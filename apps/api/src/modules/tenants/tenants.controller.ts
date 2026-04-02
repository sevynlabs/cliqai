import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Post,
  Req,
} from "@nestjs/common";
import { Request } from "express";
import { ClsService } from "nestjs-cls";
import { TenantsService } from "./tenants.service";
import { CreateClinicDto } from "./dto/create-clinic.dto";
import {
  CurrentUser,
  type AuthUser,
} from "../../common/auth/current-user.decorator";
import { MinRole } from "../../common/auth/rbac.guard";

@Controller("tenants")
export class TenantsController {
  constructor(
    private readonly tenantsService: TenantsService,
    private readonly cls: ClsService,
  ) {}

  /**
   * POST /api/tenants - Create a new clinic (organization).
   * Called during signup flow after user creation.
   */
  @Post()
  async createClinic(
    @Body() dto: CreateClinicDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    return this.tenantsService.createClinic(
      user.id,
      dto,
      req.headers as any,
    );
  }

  /**
   * GET /api/tenants/current - Get current clinic details.
   * Requires authenticated user with an active organization.
   */
  @Get("current")
  async getCurrentClinic() {
    const tenantId = this.cls.get("tenantId");
    if (!tenantId) {
      throw new NotFoundException("No active clinic selected");
    }

    const clinic = await this.tenantsService.getCurrentClinic(tenantId);
    if (!clinic) {
      throw new NotFoundException("Clinic not found");
    }

    return clinic;
  }
}
