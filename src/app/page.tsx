import { getProfile } from "@/lib/queries/getProfile";

export default async function Home() {
  const profile = await getProfile();

  return (
    <main className="p-10 text-white">
      <h1 className="text-2xl font-bold">Metagard</h1>

      <h2 className="mt-6 text-xl font-semibold">Profile</h2>
      <pre className="mt-2">{JSON.stringify(profile, null, 2)}</pre>
    </main>
  );
}
