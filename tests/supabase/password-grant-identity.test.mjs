import assert from "node:assert/strict";
import test from "node:test";
import { assertPasswordGrantIdentity } from "./password-grant-identity.mjs";

test("password-grant accepts a token whose user matches the signup identity", () => {
  const identity = { id: "synthetic-user-id" };
  const tokenBody = { user: { id: identity.id }, access_token: "synthetic-access-token" };

  assert.doesNotThrow(() => assertPasswordGrantIdentity(tokenBody, identity));
});

test("password-grant fails closed when the token subject is mismatched", () => {
  assert.throws(
    () => assertPasswordGrantIdentity({ user: { id: "different-user-id" } }, { id: "synthetic-user-id" }),
    { message: "Local synthetic Auth password-token identity mismatch." },
  );
});

test("password-grant fails closed when the token subject is missing", () => {
  assert.throws(
    () => assertPasswordGrantIdentity({ access_token: "synthetic-access-token" }, { id: "synthetic-user-id" }),
    { message: "Local synthetic Auth password-token identity mismatch." },
  );
});
