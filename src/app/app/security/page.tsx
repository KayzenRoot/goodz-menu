import { redirect } from "next/navigation";
import { AuthFrame } from "@/components/goodz/auth-frame";
import { MfaSecurityPanel, type TotpFactorSummary } from "@/components/goodz/mfa-security-panel";
import { getCurrentAuthContext } from "@/lib/supabase/auth-session";
import { readSupabaseAuthConfig } from "@/lib/env/runtime-env";

export const dynamic = "force-dynamic";

export default async function SecurityPage() {
  const auth = await getCurrentAuthContext();
  if (!auth) redirect("/login?next=%2Fapp%2Fsecurity");

  const config = readSupabaseAuthConfig();
  if (!config.ok) redirect("/login?next=%2Fapp%2Fsecurity");

  const { data, error } = await auth.client.auth.mfa.listFactors();
  const factors: TotpFactorSummary[] = error || !data
    ? []
    : data.totp.map(({ id, status, friendly_name }) => ({
        id,
        status,
        friendlyName: friendly_name ?? null,
      }));

  return (
    <AuthFrame>
      <MfaSecurityPanel
        supabaseUrl={config.config.supabaseApiUrl.toString()}
        anonKey={config.config.anonKey}
        factors={factors}
      />
    </AuthFrame>
  );
}
