import Link from "next/link";
import CustomClassForm from "@/components/CustomClassForm";

export default function NewCustomClassPage() {
  return (
    <main className="p-10 text-white max-w-lg space-y-6">
      <Link href="/custom-classes" className="text-sm text-blue-400 hover:underline">
        ← Custom Classes
      </Link>
      <h1 className="text-2xl font-bold">Create Custom Class</h1>
      <CustomClassForm mode="create" />
    </main>
  );
}
