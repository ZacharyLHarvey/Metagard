"use client";

import Link from "next/link";
import { useRef } from "react";
import LogoutButton from "@/components/LogoutButton";
import TipsToggleButton from "@/components/TipsToggleButton";

type NavItem = { href: string; label: string };

export default function NavbarMenu({
  links,
  displayName,
  discordUrl,
}: {
  links: NavItem[];
  displayName?: string | null;
  discordUrl?: string;
}) {
  const detailsRef = useRef<HTMLDetailsElement | null>(null);

  function closeMenu() {
    if (detailsRef.current) detailsRef.current.open = false;
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/settings"
        aria-label="Settings"
        title="Settings"
        className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 transition"
      >
        ⚙
      </Link>
      <details ref={detailsRef} className="relative">
        <summary className="list-none cursor-pointer px-3 py-1.5 rounded bg-neutral-800 text-sm hover:bg-neutral-700 transition">
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
          <div className="pt-2 border-t border-neutral-700 space-y-2">
            <TipsToggleButton />
            <LogoutButton />
          </div>
        </div>
      </details>
    </div>
  );
}
