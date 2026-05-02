import CreateBuildForm from "@/components/CreateBuildForm";

export default function CreateBuildPage() {
  return (
    <main className="p-10 text-white">
      <h1 className="text-2xl font-bold mb-6">Create a New Build</h1>

      <div className="border border-neutral-800 rounded-lg p-6 bg-neutral-900/40">
        <CreateBuildForm />
      </div>
    </main>
  );
}

