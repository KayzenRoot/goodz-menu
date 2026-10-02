import assert from "node:assert/strict";
import test from "node:test";
import { assertPasswordGrantIdentity } from "./password-grant-identity.mjs";

const identity = { id: "synthetic-user-id" };
const otherIdentityId = "different-synthetic-user-id";
const encodeSegment = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
const encodeRawSegment = (value) => Buffer.from(value).toString("base64url");

function makeJwt(payload, { header = { alg: "HS256", typ: "JWT" }, signature = "synthetic-signature" } = {}) {
  return [encodeSegment(header), encodeSegment(payload), encodeRawSegment(signature)].join(".");
}

function makeTokenBody(userId, payload) {
  return { user: userId === undefined ? {} : { id: userId }, access_token: makeJwt(payload) };
}

function assertGenericFailure(tokenBody, candidateIdentity = identity, sensitiveValues = []) {
  let error;
  try {
    assertPasswordGrantIdentity(tokenBody, candidateIdentity);
  } catch (caught) {
    error = caught;
  }
  assert.ok(error instanceof Error, "expected the guard to reject the invalid password-grant identity");
  assert.equal(error.message, "Local synthetic Auth password-token identity mismatch.");
  for (const value of sensitiveValues) {
    assert.equal(error.message.includes(value), false);
  }
}

test("accepts matching response user ID and JWT subject", () => {
  const tokenBody = makeTokenBody(identity.id, { sub: identity.id });

  assert.doesNotThrow(() => assertPasswordGrantIdentity(tokenBody, identity));
});

test("rejects an incorrect response user ID", () => {
  const tokenBody = makeTokenBody(otherIdentityId, { sub: identity.id });
  assertGenericFailure(tokenBody, identity, [identity.id, otherIdentityId, tokenBody.access_token]);
});

test("rejects a missing response user ID", () => {
  const tokenBody = makeTokenBody(undefined, { sub: identity.id });
  assertGenericFailure(tokenBody, identity, [identity.id, tokenBody.access_token]);
});

test("rejects a JWT subject mismatch when the response user ID matches", () => {
  const tokenBody = makeTokenBody(identity.id, { sub: otherIdentityId });
  assertGenericFailure(tokenBody, identity, [identity.id, otherIdentityId, tokenBody.access_token]);
});

test("rejects a missing JWT subject", () => {
  const tokenBody = makeTokenBody(identity.id, { aud: "authenticated" });
  assertGenericFailure(tokenBody, identity, [identity.id, tokenBody.access_token]);
});

test("rejects a malformed JWT", () => {
  const tokenBody = { user: { id: identity.id }, access_token: "not.a.jwt.with.extra.parts" };
  assertGenericFailure(tokenBody, identity, [identity.id, tokenBody.access_token]);
});

test("rejects an absent signup identity ID", () => {
  const tokenBody = makeTokenBody(identity.id, { sub: identity.id });
  assertGenericFailure(tokenBody, {}, [identity.id, tokenBody.access_token]);
});

test("rejects an absent access token", () => {
  assertGenericFailure({ user: { id: identity.id } }, identity, [identity.id]);
});

test("rejects an invalid JWT payload", () => {
  const tokenBody = {
    user: { id: identity.id },
    access_token: [encodeSegment({ alg: "HS256", typ: "JWT" }), encodeRawSegment("not-json"), encodeRawSegment("synthetic-signature")].join("."),
  };
  assertGenericFailure(tokenBody, identity, [identity.id, tokenBody.access_token]);
});

test("rejects a non-object JWT payload", () => {
  const tokenBody = makeTokenBody(identity.id, [identity.id]);
  assertGenericFailure(tokenBody, identity, [identity.id, tokenBody.access_token]);
});
