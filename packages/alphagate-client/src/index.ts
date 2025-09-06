export type ClientConfig = {
  apiKey: string;
  baseURL?: string;
};

export class AlphaGateClient {
  private apiKey: string;
  private baseURL: string;

  constructor(cfg: ClientConfig) {
    this.apiKey = cfg.apiKey;
    this.baseURL = cfg.baseURL ?? "https://api.alphagate.ai/v1";
  }

  async responsesCreate(payload: unknown): Promise<Response> {
    return fetch(`${this.baseURL}/responses`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  }

  // Placeholder for streaming; implementation can use fetch + ReadableStream
}
