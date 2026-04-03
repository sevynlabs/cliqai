import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { RedisService } from "../../common/redis/redis.service";

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getKpis(organizationId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [leadsToday, appointmentsToday, totalLeads, convertedLeads] =
      await Promise.all([
        this.prisma.lead.count({
          where: { organizationId, createdAt: { gte: today } },
        }),
        this.prisma.appointment.count({
          where: {
            organizationId,
            startAt: { gte: today },
            status: { not: "cancelled" },
          },
        }),
        this.prisma.lead.count({
          where: {
            organizationId,
            createdAt: { gte: new Date(Date.now() - 30 * 86400000) },
          },
        }),
        this.prisma.lead.count({
          where: {
            organizationId,
            stage: { in: ["agendado", "confirmado", "atendido"] },
            createdAt: { gte: new Date(Date.now() - 30 * 86400000) },
          },
        }),
      ]);

    return {
      leadsToday,
      appointmentsToday,
      conversionRate: totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0,
      totalLeads30d: totalLeads,
    };
  }

  async getFunnel(organizationId: string) {
    const stages = ["novo", "qualificado", "agendado", "confirmado", "atendido", "perdido"];
    const counts = await Promise.all(
      stages.map((stage) =>
        this.prisma.lead.count({
          where: {
            organizationId,
            stage,
            createdAt: { gte: new Date(Date.now() - 30 * 86400000) },
          },
        }),
      ),
    );
    return stages.map((stage, i) => ({ stage, count: counts[i] }));
  }

  async getActivity(organizationId: string, limit = 20) {
    return this.prisma.leadTimeline.findMany({
      where: { lead: { organizationId } },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { lead: { select: { name: true, phone: true } } },
    });
  }

  async getTodaysAgenda(organizationId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today.getTime() + 86400000);

    return this.prisma.appointment.findMany({
      where: {
        organizationId,
        startAt: { gte: today, lt: tomorrow },
        status: { not: "cancelled" },
      },
      orderBy: { startAt: "asc" },
      include: { lead: { select: { name: true, phone: true, procedureInterest: true } } },
    });
  }

  async getAgentHealth(organizationId: string) {
    const instance = await this.prisma.whatsappInstance.findFirst({
      where: { organizationId },
    });

    return {
      connected: instance?.status === "open",
      instanceName: instance?.instanceName ?? null,
      status: instance?.status ?? "disconnected",
    };
  }

  async getLeadAnalytics(organizationId: string) {
    const leads = await this.prisma.lead.findMany({
      where: { organizationId },
      select: { source: true, score: true, procedureInterest: true },
    });

    // By source
    const bySource: Record<string, number> = {};
    for (const l of leads) {
      const src = l.source || "direto";
      bySource[src] = (bySource[src] || 0) + 1;
    }

    // Score distribution
    const scoreRanges = { alto: 0, medio: 0, baixo: 0 };
    for (const l of leads) {
      if (l.score >= 70) scoreRanges.alto++;
      else if (l.score >= 40) scoreRanges.medio++;
      else scoreRanges.baixo++;
    }

    // Top procedures
    const byProcedure: Record<string, number> = {};
    for (const l of leads) {
      if (l.procedureInterest) {
        byProcedure[l.procedureInterest] = (byProcedure[l.procedureInterest] || 0) + 1;
      }
    }

    return {
      totalLeads: leads.length,
      bySource: Object.entries(bySource)
        .map(([source, count]) => ({ source, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8),
      scoreDistribution: scoreRanges,
      topProcedures: Object.entries(byProcedure)
        .map(([procedure, count]) => ({ procedure, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6),
    };
  }
}
