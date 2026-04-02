import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { AuthService } from "@thallesp/nestjs-better-auth";
import { PrismaService } from "../../common/prisma/prisma.service";
import type { Auth } from "../../common/auth/auth.config";
import { InviteUserDto } from "./dto/invite-user.dto";

@Injectable()
export class UsersService {
  constructor(
    private readonly authService: AuthService<Auth>,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Invites a user to the organization via Better Auth invitation system.
   */
  async inviteUser(
    organizationId: string,
    dto: InviteUserDto,
    headers: Record<string, string | string[] | undefined>,
  ) {
    const result = await this.authService.api.createInvitation({
      body: {
        organizationId,
        email: dto.email,
        role: dto.role as any,
      },
      headers: headers as any,
    });

    if (!result) {
      throw new BadRequestException("Failed to create invitation");
    }

    return {
      message: `Invitation sent to ${dto.email}`,
      email: dto.email,
      role: dto.role,
    };
  }

  /**
   * Lists all members of an organization.
   */
  async listMembers(organizationId: string) {
    const members = await this.prisma.member.findMany({
      where: { organizationId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return members.map((m) => ({
      id: m.id,
      userId: m.userId,
      role: m.role,
      name: m.user.name,
      email: m.user.email,
      image: m.user.image,
      joinedAt: m.createdAt,
    }));
  }

  /**
   * Updates a member's role in the organization.
   */
  async updateRole(
    organizationId: string,
    userId: string,
    newRole: string,
    headers: Record<string, string | string[] | undefined>,
  ) {
    const member = await this.prisma.member.findFirst({
      where: { organizationId, userId },
    });

    if (!member) {
      throw new NotFoundException("Member not found in this organization");
    }

    // Update via Better Auth API
    await this.authService.api.updateMemberRole({
      body: {
        memberId: member.id,
        role: newRole as any,
        organizationId,
      },
      headers: headers as any,
    });

    return {
      memberId: member.id,
      userId,
      role: newRole,
    };
  }
}
