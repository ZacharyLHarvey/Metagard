import { supabaseServer } from "@/lib/server/supabaseServer";

export default async function Home() {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.from("test").select("*").limit(1);

  return (
    <main className="p-10 text-white">
      <h1 className="text-2xl font-bold">Metagard</h1>
      <pre className="mt-4">{JSON.stringify({ data, error }, null, 2)}</pre>
    </main>
  );
}
