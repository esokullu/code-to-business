// Centralize HTTP/Undici tuning to avoid "Headers Timeout Error"
import { Agent, setGlobalDispatcher } from "undici";

// 0 bodyTimeout disables it (we handle with AbortController per request).
// Increase headersTimeout to allow slow local models to start responding.
const agent = new Agent({
  keepAliveTimeout: 10_000,
  keepAliveMaxTimeout: 60_000,
  headersTimeout: 300_000, // 5 minutes
  bodyTimeout: 0
});

setGlobalDispatcher(agent);

