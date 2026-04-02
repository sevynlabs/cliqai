import { z } from "zod";

export const recordConsentSchema = z.object({
  leadPhone: z.string().min(1, "leadPhone is required"),
  consentGiven: z.boolean(),
  consentVersion: z.string().min(1, "consentVersion is required"),
  consentChannel: z.enum(["whatsapp", "web", "sms"]),
  consentMessage: z.string().min(1, "consentMessage is required"),
  ipAddress: z.string().optional(),
});

export type RecordConsentSchema = z.infer<typeof recordConsentSchema>;

export const erasureRequestSchema = z.object({
  leadPhone: z.string().min(1, "leadPhone is required"),
});

export type ErasureRequestSchema = z.infer<typeof erasureRequestSchema>;
