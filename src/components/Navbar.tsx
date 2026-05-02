import Link from "next/link";
import { getProfile } from "@/lib/queries/getProfile";
import LogoutButton from "@/components/LogoutButton";

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

        <Link href="/profile" className="hover:text-blue-400 transition">
          Profile
        </Link>
      </div>

      {/* Right side: display_name + Logout */}
      <div className="flex items-center gap-4">
        <span className="text-neutral-300">
          {profile?.display_name}
        </span>
        <LogoutButton />
      </div>
    </nav>
  );
}
