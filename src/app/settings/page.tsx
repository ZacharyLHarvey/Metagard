import Link from "next/link";
import ThemeSettingsCard from "@/components/ThemeSettingsCard";
import { getProfile } from "@/lib/queries/getProfile";

export default async function SettingsPage() {
  const profile = await getProfile();

  if (!profile) {
    return (
      <main className="min-h-screen p-10 space-y-4">
        <h1 className="text-2xl font-bold">Site Settings</h1>
        <p className="text-neutral-400">
          Sign in to customize how the site looks and behaves.
        </p>
        <p className="text-neutral-400">
          <Link href="/login" className="text-blue-400 underline">
            Go to login
          </Link>
        </p>
      </main>
    );
  }

  const initialTheme = profile.theme_preference === "light" ? "light" : "dark";

  return (
    <main className="min-h-screen p-10 space-y-8">
      <section className="space-y-2">
        <h1 className="text-2xl font-bold">Site Settings</h1>
        <p className="text-neutral-400">
          Customize how the site looks and behaves. More settings categories will be added here over time.
        </p>
      </section>

      <section className="max-w-2xl space-y-4">
        <ThemeSettingsCard initialTheme={initialTheme} />
      </section>
    </main>
  );
}
