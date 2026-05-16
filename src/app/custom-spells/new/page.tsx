import Link from "next/link";
import CustomSpellForm from "@/components/CustomSpellForm";

export default function NewCustomSpellPage() {
  return (
    <main className="px-4 py-4 sm:px-6 lg:px-10 text-white max-w-2xl space-y-5 sm:space-y-6">
      <Link href="/custom-spells" className="text-sm text-blue-400 hover:underline">
        ← Custom Spells
      </Link>
      <h1 className="text-xl sm:text-2xl font-bold">Create Custom Spell</h1>
      <CustomSpellForm mode="create" />
    </main>
  );
}
