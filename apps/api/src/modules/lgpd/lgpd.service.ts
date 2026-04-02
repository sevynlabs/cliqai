import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { encryptPii } from "@cliniq/database";
import { RecordConsentDto } from "./dto/record-consent.dto";

@Injectable()
export class LgpdService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Records a consent entry with the leadPhone encrypted via pgcrypto.
   */
  async recordConsent(clinicId: string, data: RecordConsentDto) {
    const encryptedPhone = await encryptPii(this.prisma, data.leadPhone);
    const tenant = this.prisma.forTenant(clinicId);

    return (tenant as any).consentRecord.create({
      data: {
        clinicId,
        leadPhone: encryptedPhone,
        consentGiven: data.consentGiven,
        consentVersion: data.consentVersion,
        consentChannel: data.consentChannel,
        consentMessage: data.consentMessage,
        ipAddress: data.ipAddress,
      },
    });
  }

  /**
   * Checks if consent exists for a given phone number (encrypted lookup).
   */
  async hasConsent(clinicId: string, leadPhone: string): Promise<boolean> {
    const encryptedPhone = await encryptPii(this.prisma, leadPhone);
    const tenant = this.prisma.forTenant(clinicId);

    const record = await (tenant as any).consentRecord.findFirst({
      where: {
        clinicId,
        leadPhone: encryptedPhone,
        consentGiven: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return record !== null;
  }

  /**
   * Creates an erasure request for a phone number.
   */
  async requestErasure(clinicId: string, leadPhone: string) {
    const encryptedPhone = await encryptPii(this.prisma, leadPhone);
    const tenant = this.prisma.forTenant(clinicId);

    return (tenant as any).erasureRequest.create({
      data: {
        clinicId,
        leadPhone: encryptedPhone,
        status: "pending",
      },
    });
  }

  /**
   * Processes an erasure request: sets status to processing,
   * soft-deletes related consent records, then marks complete.
   */
  async processErasure(requestId: string) {
    const request = await this.prisma.erasureRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new Error(`Erasure request ${requestId} not found`);
    }

    // Mark as processing
    await this.prisma.erasureRequest.update({
      where: { id: requestId },
      data: { status: "processing" },
    });

    // Delete consent records for this phone in this clinic
    await this.prisma.consentRecord.deleteMany({
      where: {
        clinicId: request.clinicId,
        leadPhone: request.leadPhone,
      },
    });

    // Mark as complete
    await this.prisma.erasureRequest.update({
      where: { id: requestId },
      data: {
        status: "complete",
        processedAt: new Date(),
      },
    });

    return { status: "complete", requestId };
  }
}
