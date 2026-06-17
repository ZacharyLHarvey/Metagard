import ResetPasswordCard from "@/app/reset-password/ResetPasswordCard";
import { createClient } from "@/lib/server/supabaseServer";
import { getProfileCached } from "@/lib/queries/getProfileCached";

export default async function ResetPasswordPage() {
  const profile = await getProfileCached();
  const initialTheme = profile?.theme_preference === "light" ? "light" : "dark";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="min-h-screen flex items-center justify-center bg-neutral-950 text-white px-4 py-10">
      <ResetPasswordCard initialTheme={initialTheme} hasRecoverySession={!!user} />
    </main>
  );
}
