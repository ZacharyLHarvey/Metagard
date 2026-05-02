"use client";

import { supabaseBrowser } from "@/lib/browser/supabaseBrowser";

export default function LogoutButton() {
  async function handleLogout() {
    const supabase = supabaseBrowser();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <button
      onClick={handleLogout}
      className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-white font-medium transition"
    >
      Log Out
    </button>
  );
}
