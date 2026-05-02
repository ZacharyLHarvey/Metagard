"use client";

export default function SaveBuildButton({ buildId }: { buildId: number }) {
  function handleSave() {
    console.log("Saving build:", buildId);
    // Later: call Supabase to save the build
  }

  return (
    <button
      onClick={handleSave}
      className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm"
    >
      Save
    </button>
  );
}
