const CORRELATION_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/;

export function resolveCorrelationId(headers: Headers): string {
  const candidate = headers.get("x-correlation-id") ?? headers.get("x-request-id");
  return candidate && CORRELATION_ID_PATTERN.test(candidate)
    ? candidate
    : globalThis.crypto.randomUUID();
}

export function correlationHeaders(correlationId: string): HeadersInit {
  return {
    "cache-control": "no-store, max-age=0",
    "x-correlation-id": correlationId,
  };
}
