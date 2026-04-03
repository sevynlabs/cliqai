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
}
