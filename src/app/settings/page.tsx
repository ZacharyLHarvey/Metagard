import Link from "next/link";
import SpellbookTipsSettingsCard from "@/components/SpellbookTipsSettingsCard";
import ThemeSettingsCard from "@/components/ThemeSettingsCard";
import { getProfile } from "@/lib/queries/getProfile";

export default async function SettingsPage() {
  const profile = await getProfile();

  if (!profile) {
    return (
      <main className="min-h-screen p-10 space-y-4">
        <h1 className="text-2xl font-bold">Site Settings</h1>
        <p className="text-neutral-400">
          Sign in to Customize How the Site Looks and Behaves.
        </p>
        <p className="text-neutral-400">
          <Link href="/login" className="text-blue-400 underline">
            Go to Login
          </Link>
        </p>
      </main>
    );
  }

  const initialTheme = profile.theme_preference === "light" ? "light" : "dark";
  const initialTipsEnabled =
    "spellbook_tips_enabled" in profile && typeof profile.spellbook_tips_enabled === "boolean"
      ? profile.spellbook_tips_enabled
      : true;

  return (
    <main className="min-h-screen p-10 space-y-8">
      <section className="space-y-2">
        <h1 className="text-2xl font-bold">Site Settings</h1>
        <p className="text-neutral-400">
          Customize How the Site Looks and Behaves. More Settings Categories Will Be Added Here over
          Time.
        </p>
      </section>

      <section className="max-w-2xl space-y-4">
        <ThemeSettingsCard initialTheme={initialTheme} />
        <SpellbookTipsSettingsCard initialTipsEnabled={initialTipsEnabled} />
      </section>
    </main>
  );
}
