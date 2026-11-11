export function isPublicSupabaseAnonKey(key, allowSyntheticTestKey = false) {
  if (key.length > 4_096 || /\s/.test(key) || /^sb_secret_/i.test(key)) return false;
  if (/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) return true;

  const tokenParts = key.split(".");
  if (tokenParts.length === 3 && tokenParts[0]?.startsWith("eyJ")) {
    try {
      const payload = JSON.parse(Buffer.from(tokenParts[1], "base64url").toString("utf8"));
      return payload.role === "anon";
    } catch {
      return false;
    }
  }

  return allowSyntheticTestKey;
}
