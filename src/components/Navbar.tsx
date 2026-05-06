import Link from "next/link";
import { getProfile } from "@/lib/queries/getProfile";
import LogoutButton from "@/components/LogoutButton";
import TipsToggleButton from "@/components/TipsToggleButton";

export default async function Navbar() {
  const profile = await getProfile();

  return (
    <nav className="w-full px-6 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/50 backdrop-blur">
      
      {/* Left side: Navigation links */}
      <div className="flex items-center gap-6">
        <Link href="/" className="hover:text-blue-400 transition">
          Home
        </Link>

        <Link href="/builds" className="hover:text-blue-400 transition">
          Builds
        </Link>

        <Link href="/create-build" className="hover:text-blue-400 transition">
          Create Build
        </Link>

        <Link href="/profile" className="hover:text-blue-400 transition">
          Profile
        </Link>
        <Link href="/favorites" className="hover:text-blue-400 transition">
          Favorites
        </Link>

        <Link href="/spells" className="hover:text-blue-400 transition">
          Spells
        </Link>
        <Link href="/classes" className="hover:text-blue-400 transition">
          Classes
        </Link>

        <Link href="/leaderboards" className="hover:text-blue-400 transition">
          Leaderboards
        </Link>

        <Link href="/monsters" className="hover:text-blue-400 transition">
          Monsters
        </Link>

        <Link href="/custom-classes" className="hover:text-blue-400 transition">
          Custom classes
        </Link>

        <Link href="/battle-games" className="hover:text-blue-400 transition">
          Battle games
        </Link>

        <Link href="/custom-spells" className="hover:text-blue-400 transition">
          Custom spells
        </Link>

        {process.env.NEXT_PUBLIC_DISCORD_URL ? (
          <a
            href={process.env.NEXT_PUBLIC_DISCORD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-blue-400 transition"
          >
            Discord
          </a>
        ) : null}

        <Link href="/patch-notes" className="hover:text-blue-400 transition">
          Patch Notes
        </Link>
        <Link href="/bugs-and-features" className="hover:text-blue-400 transition">
          Bugs/Features
        </Link>
      </div>

      {/* Right side: display_name + Logout */}
      <div className="flex items-center gap-4">
        <TipsToggleButton />
        <span className="text-neutral-300">
          {profile?.display_name}
        </span>
        <LogoutButton />
      </div>
    </nav>
  );
}
