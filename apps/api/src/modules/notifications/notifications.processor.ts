import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Inject, Logger, forwardRef } from "@nestjs/common";
import { Job } from "bullmq";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { WhatsappService } from "../whatsapp/whatsapp.service";
import { NotificationsService, type NotificationJobData } from "./notifications.service";
import { PrismaService } from "../../common/prisma/prisma.service";

@Processor("notifications")
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(
    @Inject(forwardRef(() => WhatsappService))
    private readonly whatsappService: WhatsappService,
    private readonly notificationsService: NotificationsService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<NotificationJobData>): Promise<void> {
    const { type, organizationId, remoteJid, instanceName, patientName, procedureName, appointmentTime, appointmentId } = job.data;

    // Check opt-out (NOTIF-04)
    if (await this.notificationsService.isOptedOut(organizationId, remoteJid)) {
      this.logger.log(`Skipping ${type} for ${remoteJid} — opted out`);
      return;
    }

    // Check operating hours (NOTIF-05)
    if (!(await this.notificationsService.isWithinOperatingHours(organizationId))) {
      // Re-queue with 1h delay
      this.logger.log(`Outside operating hours for ${type}, re-queuing`);
      throw new Error("Outside operating hours — retry later");
    }

    // Check if appointment still valid (not cancelled)
    if (type !== "confirmation") {
      const appt = await this.prisma.appointment.findUnique({ where: { id: appointmentId } });
      if (!appt || appt.status === "cancelled") {
        this.logger.log(`Appointment ${appointmentId} cancelled — skipping ${type}`);
        return;
      }
      // For no-show: check if status is still tentative/confirmed (not attended)
      if (type === "noshow_recovery" && appt.status === "attended") {
        return;
      }
    }

    const name = patientName ?? "paciente";
    const procedure = procedureName ?? "consulta";
    const timeFormatted = appointmentTime
      ? format(new Date(appointmentTime), "EEEE, d/MM 'as' HH:mm", { locale: ptBR })
      : "";

    let message: string;

    switch (type) {
      case "confirmation":
        message = `✅ Agendamento confirmado!\n\nOla ${name}, sua ${procedure} foi agendada para ${timeFormatted}.\n\nCaso precise cancelar ou reagendar, e so me avisar aqui!`;
        break;

      case "reminder_24h":
        message = `📅 Lembrete: sua ${procedure} e amanha!\n\nOla ${name}, lembrando que sua consulta esta agendada para ${timeFormatted}.\n\nPosso confirmar sua presenca?`;
        break;

      case "reminder_1h":
        message = `⏰ Sua ${procedure} e em 1 hora!\n\nOla ${name}, sua consulta esta chegando (${timeFormatted}). Estamos te esperando!\n\nSe nao puder comparecer, me avise agora.`;
        break;

      case "noshow_recovery":
        message = `Ola ${name}, sentimos sua falta hoje na ${procedure}! 😔\n\nGostaria de reagendar? Posso verificar os proximos horarios disponiveis para voce.`;
        break;

      default:
        this.logger.warn(`Unknown notification type: ${type}`);
        return;
    }

    await this.whatsappService.sendText(instanceName, remoteJid, message);
    this.logger.log(`Sent ${type} notification to ${remoteJid}`);
  }
}
