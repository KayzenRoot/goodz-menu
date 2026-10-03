const SAFE_POST_LOGIN_PATH = "/app";

export function safePostLoginPath(candidate: unknown): string | null {
  return candidate === SAFE_POST_LOGIN_PATH ? SAFE_POST_LOGIN_PATH : null;
}
