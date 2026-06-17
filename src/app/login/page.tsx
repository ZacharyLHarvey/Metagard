import LoginAuthCard from "@/app/login/LoginAuthCard";
import { getProfileCached } from "@/lib/queries/getProfileCached";

type LoginPageProps = {
  searchParams: Promise<{ confirmed?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const profile = await getProfileCached();
  const initialTheme = profile?.theme_preference === "light" ? "light" : "dark";
  const { confirmed } = await searchParams;
  const showConfirmedBanner = confirmed === "1";

  return (
    <main className="min-h-screen flex items-center justify-center bg-neutral-950 text-white px-4 py-10">
      <LoginAuthCard
        initialTheme={initialTheme}
        showConfirmedBanner={showConfirmedBanner}
        isSignedIn={!!profile}
      />
    </main>
  );
}