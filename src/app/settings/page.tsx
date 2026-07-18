import Link from "next/link";
import BuildDisplayDefaultsSettingsCard from "@/components/BuildDisplayDefaultsSettingsCard";
import SpellbookTipsSettingsCard from "@/components/SpellbookTipsSettingsCard";
import SpellDetailLongPressSettingsCard from "@/components/SpellDetailLongPressSettingsCard";
import ThemeSettingsCard from "@/components/ThemeSettingsCard";
import {
  parseBuildEditDefaults,
  parseBuildViewDefaults,
} from "@/lib/spellbook/buildDisplayDefaults";
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
  const initialLongPressEnabled =
    "spell_detail_long_press_enabled" in profile &&
    typeof profile.spell_detail_long_press_enabled === "boolean"
      ? profile.spell_detail_long_press_enabled
      : true;
  const initialViewDefaults = parseBuildViewDefaults(
    "build_view_defaults" in profile ? profile.build_view_defaults : undefined
  );
  const initialEditDefaults = parseBuildEditDefaults(
    "build_edit_defaults" in profile ? profile.build_edit_defaults : undefined
  );

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
        <SpellDetailLongPressSettingsCard initialLongPressEnabled={initialLongPressEnabled} />
        <BuildDisplayDefaultsSettingsCard
          initialViewDefaults={initialViewDefaults}
          initialEditDefaults={initialEditDefaults}
        />
      </section>
    </main>
  );
}
