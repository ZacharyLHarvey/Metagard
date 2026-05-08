import Link from "next/link";
import { getProfile } from "@/lib/queries/getProfile";
import NavbarMenu from "@/components/NavbarMenu";

export default async function Navbar() {
  const profile = await getProfile();
  const links = [
    { href: "/", label: "Home" },
    { href: "/builds", label: "Builds" },
    { href: "/create-build", label: "Create Build" },
    { href: "/profile", label: "Profile" },
    { href: "/favorites", label: "Favorites" },
    { href: "/spells", label: "Spells" },
    { href: "/classes", label: "Classes" },
    { href: "/leaderboards", label: "Leaderboards" },
    { href: "/park-champion-tools", label: "Tools" },
    { href: "/monsters", label: "Monsters" },
    { href: "/custom-classes", label: "Custom classes" },
    { href: "/battlegames", label: "Battlegames" },
    { href: "/custom-spells", label: "Custom spells" },
    { href: "/patch-notes", label: "Patch Notes" },
    { href: "/bugs-and-features", label: "Bugs/Features" },
  ];

  return (
    <>
      <nav className="w-full px-4 py-3 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/60 backdrop-blur sticky top-0 z-40">
        <Link href="/" className="font-semibold text-sm sm:text-base">
          Metagard
        </Link>

        <NavbarMenu
          links={links}
          displayName={profile?.display_name}
          discordUrl={process.env.NEXT_PUBLIC_DISCORD_URL}
        />
      </nav>

      <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-neutral-800 bg-neutral-900/95 backdrop-blur">
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
