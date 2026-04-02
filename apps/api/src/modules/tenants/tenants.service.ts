import { Injectable, BadRequestException } from "@nestjs/common";
import { AuthService } from "@thallesp/nestjs-better-auth";
import { PrismaService } from "../../common/prisma/prisma.service";
import type { Auth } from "../../common/auth/auth.config";
import { CreateClinicDto } from "./dto/create-clinic.dto";

@Injectable()
export class TenantsService {
  constructor(
    private readonly authService: AuthService<Auth>,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Creates a new clinic (organization) via Better Auth.
   * Also creates ClinicSettings record for business-specific data.
   */
  async createClinic(
    userId: string,
    dto: CreateClinicDto,
    headers: Record<string, string | string[] | undefined>,
  ) {
    const slug =
      dto.slug ||
      dto.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

    // Create organization via Better Auth API
    const result = await this.authService.api.createOrganization({
      body: {
        name: dto.name,
        slug,
      },
      headers: headers as any,
    });

    if (!result) {
      throw new BadRequestException("Failed to create organization");
    }

    const orgId =
      typeof result === "object" && "id" in result
        ? (result as any).id
        : null;

    if (!orgId) {
      throw new BadRequestException(
        "Organization created but ID not returned",
      );
    }

    // Create clinic settings extension
    await this.prisma.clinicSettings.create({
      data: {
        organizationId: orgId,
        timezone: "America/Sao_Paulo",
        retentionDays: 365,
      },
    });

    // Set as user's active organization
    await this.authService.api.setActiveOrganization({
      body: { organizationId: orgId },
      headers: headers as any,
    });

    return {
      id: orgId,
      name: dto.name,
      slug,
    };
  }

  /**
   * Gets the current clinic (organization) details including settings.
   */
  async getCurrentClinic(organizationId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: { clinicSettings: true },
    });

    if (!org) {
      return null;
    }

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      logo: org.logo,
      createdAt: org.createdAt,
      settings: org.clinicSettings
        ? {
            timezone: org.clinicSettings.timezone,
            retentionDays: org.clinicSettings.retentionDays,
          }
        : null,
    };
  }
}
