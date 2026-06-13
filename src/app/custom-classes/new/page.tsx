import Link from "next/link";
import CustomClassWizard from "@/components/customClass/CustomClassWizard";

export default function NewCustomClassPage() {
  return (
    <main className="px-4 py-4 sm:px-6 lg:px-10 text-white max-w-4xl space-y-6">
      <Link href="/custom-classes" className="text-sm text-blue-400 hover:underline">
        ← Custom Classes
      </Link>
      <h1 className="text-2xl font-bold">Create Custom Class</h1>
      <CustomClassWizard mode="create" />
    </main>
  );
}
