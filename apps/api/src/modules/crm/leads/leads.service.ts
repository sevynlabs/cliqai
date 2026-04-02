import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { PipelineService } from "../pipeline/pipeline.service";

export interface LeadFilters {
  stage?: string;
  source?: string;
  procedure?: string;
  dateFrom?: string;
  dateTo?: string;
  scoreMin?: number;
  scoreMax?: number;
  tags?: string[];
  skip?: number;
  take?: number;
}

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pipelineService: PipelineService,
  ) {}

  /**
   * Upsert a lead from an inbound WhatsApp conversation.
   * Deduplicates by organizationId + phone (stripped from remoteJid).
   */
  async upsertFromConversation(
    organizationId: string,
    remoteJid: string,
    conversationId: string,
  ) {
    const phone = remoteJid.split("@")[0];

    const lead = await this.prisma.lead.upsert({
      where: {
        organizationId_phone: { organizationId, phone },
      },
      create: {
        organizationId,
        phone,
        source: "whatsapp",
        conversationId,
      },
      update: {
        updatedAt: new Date(),
      },
    });

    this.logger.debug(
      `Lead upserted: ${lead.id} (org: ${organizationId}, phone: ${phone})`,
    );

    return lead;
  }

  /**
   * Update lead fields from the SDR agent state after graph invocation.
   */
  async updateFromAgentState(
    leadId: string,
    state: Partial<{
      name: string | null;
      procedureInterest: string | null;
      score: number;
      stage: string;
    }>,
  ) {
    const data: Record<string, any> = {};

    if (state.name !== undefined && state.name !== null) {
      data.name = state.name;
    }
    if (
      state.procedureInterest !== undefined &&
      state.procedureInterest !== null
    ) {
      data.procedureInterest = state.procedureInterest;
    }
    if (state.score !== undefined) {
      data.score = state.score;
    }

    // Stage change: validate and add timeline entry
    if (state.stage) {
      const currentLead = await this.prisma.lead.findUnique({
        where: { id: leadId },
        select: { stage: true },
      });

      if (
        currentLead &&
        currentLead.stage !== state.stage &&
        this.pipelineService.isValidTransition(currentLead.stage, state.stage)
      ) {
        data.stage = state.stage;

        await this.prisma.leadTimeline.create({
          data: {
            leadId,
            eventType: "stage_change",
            description: `Stage changed from ${currentLead.stage} to ${state.stage}`,
            metadata: {
              from: currentLead.stage,
              to: state.stage,
              source: "agent",
            },
          },
        });
      }
    }

    if (Object.keys(data).length > 0) {
      return this.prisma.lead.update({
        where: { id: leadId },
        data,
      });
    }

    return null;
  }

  /**
   * Manually update lead stage with validation.
   */
  async updateStage(
    leadId: string,
    organizationId: string,
    newStage: string,
  ) {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, organizationId },
    });

    if (!lead) {
      throw new NotFoundException("Lead not found");
    }

    if (!this.pipelineService.isValidTransition(lead.stage, newStage)) {
      throw new BadRequestException(
        `Invalid stage transition from ${lead.stage} to ${newStage}`,
      );
    }

    await this.prisma.leadTimeline.create({
      data: {
        leadId,
        eventType: "stage_change",
        description: `Stage changed from ${lead.stage} to ${newStage}`,
        metadata: { from: lead.stage, to: newStage, source: "manual" },
      },
    });

    return this.prisma.lead.update({
      where: { id: leadId },
      data: { stage: newStage },
    });
  }

  /**
   * List leads with dynamic filters and pagination.
   */
  async findAll(organizationId: string, filters: LeadFilters = {}) {
    const where: any = { organizationId };

    if (filters.stage) where.stage = filters.stage;
    if (filters.source) where.source = filters.source;
    if (filters.procedure) {
      where.procedureInterest = { contains: filters.procedure, mode: "insensitive" };
    }
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.createdAt.lte = new Date(filters.dateTo);
    }
    if (filters.scoreMin !== undefined || filters.scoreMax !== undefined) {
      where.score = {};
      if (filters.scoreMin !== undefined) where.score.gte = filters.scoreMin;
      if (filters.scoreMax !== undefined) where.score.lte = filters.scoreMax;
    }
    if (filters.tags && filters.tags.length > 0) {
      where.tags = { hasSome: filters.tags };
    }

    const [leads, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        include: {
          _count: { select: { annotations: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: filters.skip ?? 0,
        take: filters.take ?? 50,
      }),
      this.prisma.lead.count({ where }),
    ]);

    return { leads, total };
  }

  /**
   * Global search across name, phone, and email using ILIKE.
   */
  async search(organizationId: string, query: string) {
    return this.prisma.lead.findMany({
      where: {
        organizationId,
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { phone: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
        ],
      },
      include: {
        _count: { select: { annotations: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 20,
    });
  }

  /**
   * Get a single lead with all related data.
   */
  async findById(organizationId: string, leadId: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, organizationId },
      include: {
        annotations: { orderBy: { createdAt: "desc" } },
        timeline: { orderBy: { createdAt: "desc" } },
        appointments: { orderBy: { startAt: "desc" } },
      },
    });

    if (!lead) {
      throw new NotFoundException("Lead not found");
    }

    return lead;
  }
}
