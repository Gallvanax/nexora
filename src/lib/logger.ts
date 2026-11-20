type LogLevel = "info" | "warn" | "error";

const REDACT_KEYS = new Set([
  "password",
  "passwordHash",
  "newPassword",
  "currentPassword",
  "token",
  "tokenHash",
  "accessToken",
  "refreshToken",
  "secret",
  "authorization",
  "cookie",
  "apiKey",
]);

function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[Truncated]";
  if (value === null || value === undefined) return value;
  if (typeof value === "string") {
    return value.length > 500 ? `${value.slice(0, 500)}…` : value;
  }
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => sanitize(item, depth + 1));
  }
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
    };
  }

  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (REDACT_KEYS.has(key) || key.toLowerCase().includes("secret")) {
      out[key] = "[REDACTED]";
    } else {
      out[key] = sanitize(val, depth + 1);
    }
  }
  return out;
}

function writeLog(level: LogLevel, event: string, context?: Record<string, unknown>) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    event,
    ...(context ? { context: sanitize(context) } : {}),
  };
  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.info(line);
  }
}

export const logger = {
  info: (event: string, context?: Record<string, unknown>) => writeLog("info", event, context),
  warn: (event: string, context?: Record<string, unknown>) => writeLog("warn", event, context),
  error: (event: string, context?: Record<string, unknown>) => writeLog("error", event, context),
};
