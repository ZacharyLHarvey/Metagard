import { getProfile } from "@/lib/queries/getProfile";

export default async function ProfilePage() {
  const profile = await getProfile();

  return (
    <main className="min-h-screen bg-neutral-950 text-white p-10">
      <h1 className="text-2xl font-bold">Your Profile</h1>

      <pre className="mt-6 bg-neutral-900 p-4 rounded border border-neutral-800">
        {JSON.stringify(profile, null, 2)}
      </pre>
    </main>
  );
}
