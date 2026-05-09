"use client";

import Link from "next/link";
import { useRef } from "react";
import LogoutButton from "@/components/LogoutButton";

type NavItem = { href: string; label: string };

export default function NavbarMenu({
  links,
  displayName,
  profileNavLabel,
  discordUrl,
}: {
  links: NavItem[];
  displayName?: string | null;
  /** Shown on the profile button when signed in; omitted when not authenticated. */
  profileNavLabel?: string;
  discordUrl?: string;
}) {
  const detailsRef = useRef<HTMLDetailsElement | null>(null);

  function closeMenu() {
    if (detailsRef.current) detailsRef.current.open = false;
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      {profileNavLabel ? (
        <Link
          href="/profile"
          title="Profile"
          aria-label={`Profile: ${profileNavLabel}`}
          className="inline-flex max-w-[10rem] shrink items-center truncate rounded bg-neutral-800 px-3 py-1.5 text-sm text-neutral-100 hover:bg-neutral-700 sm:max-w-[14rem] transition"
        >
          {profileNavLabel}
        </Link>
      ) : null}
      <Link
        href="/settings"
        aria-label="Settings"
        title="Settings"
        className="inline-flex shrink-0 items-center justify-center rounded bg-neutral-800 px-3 py-1.5 text-sm hover:bg-neutral-700 transition"
      >
        ⚙
      </Link>
      <details ref={detailsRef} className="relative">
        <summary className="list-none cursor-pointer inline-flex items-center rounded bg-neutral-800 px-3 py-1.5 text-sm hover:bg-neutral-700 transition">
          Menu
        </summary>
        <div className="absolute right-0 mt-2 w-64 rounded-lg border border-neutral-700 bg-neutral-900 p-3 space-y-2 max-h-[70vh] overflow-auto z-50">
          <p className="text-xs text-neutral-400 px-2">{displayName}</p>
          {links.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={closeMenu}
              className="block px-2 py-2 rounded hover:bg-neutral-800"
            >
              {item.label}
            </Link>
          ))}
          {discordUrl ? (
            <a
              href={discordUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={closeMenu}
              className="block px-2 py-2 rounded hover:bg-neutral-800"
            >
              Discord
            </a>
          ) : null}
          <div className="pt-2 border-t border-neutral-700">
            <LogoutButton />
          </div>
        </div>
      </details>
    </div>
  );
}
