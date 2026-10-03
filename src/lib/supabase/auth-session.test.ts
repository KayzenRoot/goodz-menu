import { describe, expect, it, vi } from "vitest";
import * as authSession from "@/lib/supabase/auth-session";

type AuthUserReader = (client: unknown) => Promise<{ id: string; user_metadata?: Record<string, unknown> } | null>;

function requireAuthUserReader() {
  const reader = (authSession as unknown as { getValidatedAuthUser?: AuthUserReader }).getValidatedAuthUser;
  expect(reader).toBeTypeOf("function");
  return reader;
}

describe("server-validated Supabase identity", () => {
  it("uses the Auth server user record instead of the stored session object", async () => {
    const reader = requireAuthUserReader();
    if (!reader) return;

    const user = { id: "auth-user-1", user_metadata: { organization_id: "untrusted" } };
    const getUser = vi.fn().mockResolvedValue({ data: { user }, error: null });
    const getSession = vi.fn().mockRejectedValue(new Error("session storage must not be trusted"));

    await expect(reader({ auth: { getUser, getSession } })).resolves.toEqual(user);
    expect(getUser).toHaveBeenCalledOnce();
    expect(getSession).not.toHaveBeenCalled();
  });

  it("fails closed when the Auth server rejects or omits identity", async () => {
    const reader = requireAuthUserReader();
    if (!reader) return;

    await expect(reader({ auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error("invalid") }) } })).resolves.toBeNull();
    await expect(reader({ auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "" } }, error: null }) } })).resolves.toBeNull();
    await expect(reader({ auth: { getUser: vi.fn().mockRejectedValue(new Error("unavailable")) } })).resolves.toBeNull();
  });
});
