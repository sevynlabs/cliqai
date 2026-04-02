export interface SendMessageJobData {
  instanceName: string;
  to: string;
  text?: string;
  mediaType?: "image" | "document" | "audio";
  mediaUrl?: string;
  caption?: string;
}
