import "./http.js"; // ensure dispatcher is configured before any fetch

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export interface LMStudioOptions {
  baseUrl?: string;      // default http://127.0.0.1:1234
  model?: string;        // e.g., "oss-20b"
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  requestTimeoutMs?: number; // abort if no response in this time (client-side)
  retries?: number;          // network retries
  retryBaseMs?: number;      // backoff base
}

type LMStudioResponse = {
  choices?: { message?: { content?: string } }[];
  error?: { message?: string };
};

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

export async function chatCompletion(
  messages: ChatMessage[],
  opts: LMStudioOptions = {}
): Promise<string> {
  const baseUrl = opts.baseUrl ?? process.env.LMSTUDIO_BASE_URL ?? "http://127.0.0.1:1234";
  const model   = opts.model   ?? process.env.LMSTUDIO_MODEL    ?? "local-model";

  const body = {
    model,
    messages,
    temperature: opts.temperature ?? 0.2,
    max_tokens: opts.maxTokens ?? 4096,
    stream: false
  };

  const url = `${baseUrl}/v1/chat/completions`;

  const retries = opts.retries ?? 3;
  const retryBase = opts.retryBaseMs ?? 800;
  const requestTimeout = opts.requestTimeoutMs ?? 300_000; // 5 minutes client-side

  let lastErr: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetchWithTimeout(
        url,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        },
        requestTimeout
      );

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        // 429/503 often transient on local servers spinning up
        if ((res.status === 429 || res.status >= 500) && attempt < retries) {
          const delay = retryBase * Math.pow(2, attempt);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        throw new Error(`LM Studio error ${res.status}: ${text}`);
      }

      const data = (await res.json()) as LMStudioResponse;
      if (data?.error?.message) throw new Error(`LM Studio error: ${data.error.message}`);

      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error("Empty response from LM Studio.");
      return content;
    } catch (e) {
      lastErr = e;
      // Retry on network-ish errors (including AbortError / timeouts)
      const isLast = attempt >= retries;
      if (isLast) break;
      const delay = retryBase * Math.pow(2, attempt);
      await new Promise(r => setTimeout(r, delay));
    }
  }

  throw new Error(`Failed to reach LM Studio after ${retries + 1} attempts: ${String(lastErr)}`);
}

