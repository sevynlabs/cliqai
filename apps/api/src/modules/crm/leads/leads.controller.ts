import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Body,
  UnauthorizedException,
} from "@nestjs/common";
import { ClsService } from "nestjs-cls";
import { OrgRoles } from "@thallesp/nestjs-better-auth";
import { LeadsService } from "./leads.service";
import { UpdateStageDto } from "./dto/update-stage.dto";

@Controller("api/leads")
export class LeadsController {
  constructor(
    private readonly leadsService: LeadsService,
    private readonly cls: ClsService,
  ) {}

  private getTenantId(): string {
    const tenantId = this.cls.get("tenantId");
    if (!tenantId) {
      throw new UnauthorizedException("No active organization");
    }
    return tenantId;
  }

  /**
   * GET /api/leads - List leads with filters and pagination.
   */
  @Get()
  @OrgRoles(["owner", "admin", "manager", "attendant"])
  async findAll(
    @Query("stage") stage?: string,
    @Query("source") source?: string,
    @Query("procedure") procedure?: string,
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
    @Query("scoreMin") scoreMin?: string,
    @Query("scoreMax") scoreMax?: string,
    @Query("tags") tags?: string,
    @Query("skip") skip?: string,
    @Query("take") take?: string,
  ) {
    const tenantId = this.getTenantId();
    return this.leadsService.findAll(tenantId, {
      stage,
      source,
      procedure,
      dateFrom,
      dateTo,
      scoreMin: scoreMin ? parseInt(scoreMin, 10) : undefined,
      scoreMax: scoreMax ? parseInt(scoreMax, 10) : undefined,
      tags: tags ? tags.split(",") : undefined,
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  /**
   * GET /api/leads/search?q= - Global search by name, phone, email.
   */
  @Get("search")
  @OrgRoles(["owner", "admin", "manager", "attendant"])
  async search(@Query("q") query: string) {
    const tenantId = this.getTenantId();
    return this.leadsService.search(tenantId, query || "");
  }

  /**
   * GET /api/leads/:id - Get single lead with annotations, timeline, appointments.
   */
  @Get(":id")
  @OrgRoles(["owner", "admin", "manager", "attendant"])
  async findById(@Param("id") id: string) {
    const tenantId = this.getTenantId();
    return this.leadsService.findById(tenantId, id);
  }

  /**
   * PATCH /api/leads/:id/stage - Update lead pipeline stage.
   */
  @Patch(":id/stage")
  @OrgRoles(["owner", "admin", "manager", "attendant"])
  async updateStage(
    @Param("id") id: string,
    @Body() dto: UpdateStageDto,
  ) {
    const tenantId = this.getTenantId();
    return this.leadsService.updateStage(id, tenantId, dto.stage);
  }
}
