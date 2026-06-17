import ForgotPasswordCard from "@/app/forgot-password/ForgotPasswordCard";
import { getProfileCached } from "@/lib/queries/getProfileCached";

export default async function ForgotPasswordPage() {
  const profile = await getProfileCached();
  const initialTheme = profile?.theme_preference === "light" ? "light" : "dark";

  return (
    <main className="min-h-screen flex items-center justify-center bg-neutral-950 text-white px-4 py-10">
      <ForgotPasswordCard initialTheme={initialTheme} />
    </main>
  );
}
