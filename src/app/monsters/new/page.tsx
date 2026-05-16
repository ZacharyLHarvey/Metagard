import Link from "next/link";
import MonsterForm from "@/components/MonsterForm";

export default function NewMonsterPage() {
  return (
    <main className="px-4 py-4 sm:px-6 lg:px-10 text-white max-w-2xl space-y-5 sm:space-y-6">
      <Link href="/monsters" className="text-sm text-blue-400 hover:underline">
        ← Monsters
      </Link>
      <h1 className="text-xl sm:text-2xl font-bold">Create Monster</h1>
      <MonsterForm mode="create" />
    </main>
  );
}
