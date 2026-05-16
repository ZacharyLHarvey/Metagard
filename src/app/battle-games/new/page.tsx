import Link from "next/link";
import BattlegameForm from "@/components/BattlegameForm";

export default function NewBattleGamePage() {
  return (
    <main className="px-4 py-4 sm:px-6 lg:px-10 text-white max-w-2xl space-y-5 sm:space-y-6">
      <Link href="/battlegames" className="text-sm text-blue-400 hover:underline">
        ← Battlegames
      </Link>
      <h1 className="text-xl sm:text-2xl font-bold">Create Battlegame</h1>
      <BattlegameForm mode="create" />
    </main>
  );
}
