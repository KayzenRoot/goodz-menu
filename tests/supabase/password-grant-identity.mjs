import { TextDecoder } from "node:util";

const identityFailure = "Local synthetic Auth password-token identity mismatch.";
const base64UrlSegmentPattern = /^[A-Za-z0-9_-]+$/;

function failIdentityVerification() {
  throw new Error(identityFailure);
}

function decodeBase64UrlSegment(segment) {
  if (
    typeof segment !== "string"
    || segment.length === 0
    || segment.length % 4 === 1
    || !base64UrlSegmentPattern.test(segment)
  ) {
    failIdentityVerification();
  }

  const bytes = Buffer.from(segment, "base64url");
  if (bytes.toString("base64url") !== segment) {
    failIdentityVerification();
  }

  return bytes;
}

function decodeJsonObject(segment) {
  try {
    const json = new TextDecoder("utf-8", { fatal: true }).decode(decodeBase64UrlSegment(segment));
    const value = JSON.parse(json);
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      failIdentityVerification();
    }
    return value;
  } catch {
    failIdentityVerification();
  }
}

export function assertPasswordGrantIdentity(tokenBody, identity) {
  const identityId = identity?.id;
  const accessToken = tokenBody?.access_token;
  if (typeof identityId !== "string" || identityId.trim().length === 0 || typeof accessToken !== "string" || accessToken.length === 0) {
    failIdentityVerification();
  }

  const tokenParts = accessToken.split(".");
  if (tokenParts.length !== 3) {
    failIdentityVerification();
  }

  decodeJsonObject(tokenParts[0]);
  const payload = decodeJsonObject(tokenParts[1]);
  decodeBase64UrlSegment(tokenParts[2]);

  if (payload.sub !== identityId || tokenBody.user?.id !== identityId) {
    failIdentityVerification();
  }
}
