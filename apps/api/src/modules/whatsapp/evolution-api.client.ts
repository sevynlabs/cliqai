import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosInstance, AxiosError } from "axios";

export interface CreateInstanceResponse {
  instanceName: string;
  qrcode: string;
}

export interface ConnectionStateResponse {
  state: "open" | "close" | "connecting";
}

@Injectable()
export class EvolutionApiClient {
  private readonly http: AxiosInstance;
  private readonly logger = new Logger(EvolutionApiClient.name);

  constructor(private readonly configService: ConfigService) {
    const baseURL = this.configService.get<string>(
      "EVOLUTION_API_URL",
      "http://localhost:8080",
    );
    const apiKey = this.configService.get<string>("EVOLUTION_API_KEY", "");

    this.http = axios.create({
      baseURL,
      headers: {
        apikey: apiKey,
        "Content-Type": "application/json",
      },
      timeout: 15000,
    });

    // Retry interceptor for 5xx errors: 3 retries with exponential backoff
    this.http.interceptors.response.use(undefined, async (error: AxiosError) => {
      const config = error.config as any;
      if (!config) return Promise.reject(error);

      config.__retryCount = config.__retryCount || 0;

      const is5xx = error.response && error.response.status >= 500;
      if (!is5xx || config.__retryCount >= 3) {
        return Promise.reject(error);
      }

      config.__retryCount += 1;
      const delayMs = Math.pow(2, config.__retryCount - 1) * 1000; // 1s, 2s, 4s
      this.logger.warn(
        `Retrying request (attempt ${config.__retryCount}/3) after ${delayMs}ms: ${config.url}`,
      );

      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return this.http.request(config);
    });
  }

  async createInstance(
    instanceName: string,
    webhookUrl: string,
  ): Promise<CreateInstanceResponse> {
    const { data } = await this.http.post("/instance/create", {
      instanceName,
      webhookUrl,
      webhookByEvents: false,
      events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "QRCODE_UPDATED"],
      qrcode: true,
    });
    return {
      instanceName: data.instanceName || instanceName,
      qrcode: data.qrcode?.base64 || data.qrcode || "",
    };
  }

  async getConnectionState(
    instanceName: string,
  ): Promise<"open" | "close" | "connecting"> {
    const { data } = await this.http.get(
      `/instance/connectionState/${instanceName}`,
    );
    return data.state || data.instance?.state || "close";
  }

  async deleteInstance(instanceName: string): Promise<void> {
    await this.http.delete(`/instance/delete/${instanceName}`);
  }

  async sendText(
    instanceName: string,
    to: string,
    text: string,
  ): Promise<void> {
    await this.http.post(`/message/sendText/${instanceName}`, {
      number: to,
      text,
    });
  }

  async sendMedia(
    instanceName: string,
    to: string,
    mediaType: "image" | "document" | "audio",
    url: string,
    caption?: string,
  ): Promise<void> {
    await this.http.post(`/message/sendMedia/${instanceName}`, {
      number: to,
      mediatype: mediaType,
      media: url,
      caption,
    });
  }
}
