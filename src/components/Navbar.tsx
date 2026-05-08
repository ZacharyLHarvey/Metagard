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
        <Link href="/park-champion-tools" className="hover:text-blue-400 transition">
          Park Champion Tools
        </Link>

        <Link href="/monsters" className="hover:text-blue-400 transition">
          Monsters
        </Link>

        <Link href="/custom-classes" className="hover:text-blue-400 transition">
          Custom classes
        </Link>

        <Link href="/battlegames" className="hover:text-blue-400 transition">
          Battlegames
        </Link>

        <Link href="/custom-spells" className="hover:text-blue-400 transition">
          Custom spells
        </Link>

        <Link
          href="/settings"
          aria-label="Settings"
          title="Settings"
          className="hover:text-blue-400 transition inline-flex items-center justify-center"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.325 4.317a1.724 1.724 0 013.35 0 1.724 1.724 0 002.573 1.066 1.724 1.724 0 012.889 1.666 1.724 1.724 0 001.286 2.171 1.724 1.724 0 010 3.56 1.724 1.724 0 00-1.286 2.17 1.724 1.724 0 01-2.89 1.667 1.724 1.724 0 00-2.572 1.065 1.724 1.724 0 01-3.35 0 1.724 1.724 0 00-2.573-1.065 1.724 1.724 0 01-2.889-1.667 1.724 1.724 0 00-1.286-2.17 1.724 1.724 0 010-3.56 1.724 1.724 0 001.286-2.171 1.724 1.724 0 012.89-1.666 1.724 1.724 0 002.572-1.066z"
            />
            <circle cx="12" cy="12" r="3.25" />
          </svg>
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
