import ThemedAppIcon from "@/components/ThemedAppIcon";
import { getProfileCached } from "@/lib/queries/getProfileCached";

export default async function Loading() {
  const profile = await getProfileCached();
  const initialTheme = profile?.theme_preference === "light" ? "light" : "dark";

  return (
    <div
      className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 py-20"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <ThemedAppIcon
        initialTheme={initialTheme}
        className="h-32 w-32 animate-pulse opacity-95 sm:h-40 sm:w-40"
        sizes="(max-width: 640px) 128px, 160px"
        priority
      />
      <p className="text-sm text-neutral-400">Loading…</p>
    </div>
  );
}
