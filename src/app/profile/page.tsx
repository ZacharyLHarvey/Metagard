import Link from "next/link";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/queries/getProfile";

export default async function ProfilePage() {
  const profile = await getProfile();

  if (!profile || !("id" in profile) || profile.id == null) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white px-4 py-4 sm:px-6 lg:px-10">
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="mt-4 text-neutral-400">
          <Link href="/login" className="text-blue-400 underline">
            Sign in
          </Link>{" "}
          to view your profile.
        </p>
      </main>
    );
  }

  redirect(`/profile/${String(profile.id)}`);
}
