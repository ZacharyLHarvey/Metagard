import Link from "next/link";
import { getProfileCached } from "@/lib/queries/getProfileCached";
import NavbarMenu from "@/components/NavbarMenu";
import ThemedAppIcon from "@/components/ThemedAppIcon";

export default async function Navbar() {
  const profile = await getProfileCached();
  const initialTheme = profile?.theme_preference === "light" ? "light" : "dark";
  const profileNavLabel = profile
    ? (profile.display_name?.trim() || "Profile")
    : undefined;
  const links = [
    { href: "/", label: "Home" },
    { href: "/search", label: "Search" },
    { href: "/builds", label: "Builds" },
    { href: "/build-groups", label: "Build Groups" },
    { href: "/create-build", label: "Create Build" },
    { href: "/leaderboards", label: "Leaderboards" },
    { href: "/activity", label: "Activity" },
    { href: "/battlegames", label: "Battlegames" },
    { href: "/spells", label: "Spells" },
    { href: "/classes", label: "Classes" },
    { href: "/monsters", label: "Monsters" },
    { href: "/custom-classes", label: "Custom Classes" },
    { href: "/custom-builds", label: "Custom Builds" },
    { href: "/create-custom-build", label: "Create Custom Build" },
    { href: "/custom-spells", label: "Custom Spells" },
    { href: "/park-champion-tools", label: "Tools" },
    { href: "/favorites", label: "Favorites" },
    { href: "/profile", label: "Profile" },
    { href: "/patch-notes", label: "Patch Notes" },
    { href: "/bugs-and-features", label: "Bugs/Features" },
  ];

  return (
    <>
      <nav className="w-full px-4 py-3 border-b border-neutral-800 flex items-center justify-between gap-3 bg-neutral-900/60 backdrop-blur sticky top-0 z-40">
        <Link
          href="/"
          className="flex min-w-0 shrink items-center"
          aria-label="Metagard Home"
        >
          <ThemedAppIcon
            initialTheme={initialTheme}
            className="h-10 w-10 sm:h-11 sm:w-11"
            sizes="(max-width: 640px) 40px, 44px"
            priority
          />
        </Link>

        <NavbarMenu
          links={links}
          displayName={profile?.display_name}
          profileNavLabel={profileNavLabel}
          discordUrl={process.env.NEXT_PUBLIC_DISCORD_URL}
        />
      </nav>

      <nav
        className="fixed bottom-0 inset-x-0 z-40 border-t border-neutral-800 bg-neutral-900/95 backdrop-blur pb-[env(safe-area-inset-bottom,0px)]"
        aria-label="Bottom navigation"
      >
        <div className="grid grid-cols-5 text-xs">
          <Link href="/" className="py-2 text-center hover:text-blue-400">Home</Link>
          <Link href="/builds" className="py-2 text-center hover:text-blue-400">Builds</Link>
          <Link href="/create-build" className="py-2 text-center hover:text-blue-400">Create</Link>
          <Link href="/leaderboards" className="py-2 text-center hover:text-blue-400">Ranks</Link>
          <Link href="/profile" className="py-2 text-center hover:text-blue-400">Profile</Link>
        </div>
      </nav>
    </>
  );
}
