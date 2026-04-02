import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import { Request } from "express";
import { ClsService } from "nestjs-cls";
import { OrgRoles } from "@thallesp/nestjs-better-auth";
import { UsersService } from "./users.service";
import { InviteUserDto } from "./dto/invite-user.dto";

@Controller("users")
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly cls: ClsService,
  ) {}

  /**
   * POST /api/users/invite - Invite a user to the current clinic.
   * Only owners and admins can invite.
   */
  @Post("invite")
  @OrgRoles(["owner", "admin"])
  async inviteUser(@Body() dto: InviteUserDto, @Req() req: Request) {
    const tenantId = this.cls.get("tenantId");
    if (!tenantId) {
      throw new UnauthorizedException("No active organization");
    }

    return this.usersService.inviteUser(tenantId, dto, req.headers as any);
  }

  /**
   * GET /api/users - List all members of the current clinic.
   */
  @Get()
  async listMembers() {
    const tenantId = this.cls.get("tenantId");
    if (!tenantId) {
      throw new UnauthorizedException("No active organization");
    }

    return this.usersService.listMembers(tenantId);
  }

  /**
   * PATCH /api/users/:id/role - Update a member's role.
   * Only owners can change roles.
   */
  @Patch(":id/role")
  @OrgRoles(["owner"])
  async updateRole(
    @Param("id") userId: string,
    @Body("role") role: string,
    @Req() req: Request,
  ) {
    const tenantId = this.cls.get("tenantId");
    if (!tenantId) {
      throw new UnauthorizedException("No active organization");
    }

    return this.usersService.updateRole(
      tenantId,
      userId,
      role,
      req.headers as any,
    );
  }
}
