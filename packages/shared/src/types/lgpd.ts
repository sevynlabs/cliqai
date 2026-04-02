export type ConsentChannel = "whatsapp" | "web" | "sms";

export type ErasureStatus = "pending" | "processing" | "complete";

export interface RecordConsentInput {
  leadPhone: string;
  consentGiven: boolean;
  consentVersion: string;
  consentChannel: ConsentChannel;
  consentMessage: string;
  ipAddress?: string;
}

export interface ErasureRequestInput {
  leadPhone: string;
}
