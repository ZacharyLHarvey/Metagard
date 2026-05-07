import { Suspense } from "react";
import ParkChampionRandomBattlegamePicker from "@/components/ParkChampionRandomBattlegamePicker";

export default function ParkChampionToolsPage() {
  return (
    <main className="p-10 text-white space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Park Champion Tools</h1>
        <p className="text-sm text-neutral-400">
          Utility hub for park operations. Additional tools can be added as new sections below.
        </p>
      </header>

      <Suspense fallback={<p className="text-sm text-neutral-400">Loading tools…</p>}>
        <ParkChampionRandomBattlegamePicker />
      </Suspense>
    </main>
  );
}
