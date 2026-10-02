import { randomUUID } from "node:crypto";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function requestCorrelationId(request: Request): string {
  const candidate = request.headers.get("x-request-id");
  return candidate && UUID_PATTERN.test(candidate) ? candidate : randomUUID();
}

export function safeBuildRevision(value = process.env.BUILD_REVISION): string {
  if (!value) return "local";
  return /^[a-zA-Z0-9._-]{1,80}$/.test(value) ? value : "unknown";
}

export function safeRuntimeName(value = process.env.GOODZ_RUNTIME): string {
  return value === "docker" || value === "native" ? value : "unknown";
}

export function safeEnvironmentName(): string {
  const value = process.env.GOODZ_ENVIRONMENT ?? (process.env.NODE_ENV === "production" ? "production" : "local");
  return ["local", "test", "staging", "production"].includes(value) ? value : "unknown";
}
