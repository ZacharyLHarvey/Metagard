import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import FaviconThemeSync from "@/components/FaviconThemeSync";
import Navbar from "@/components/Navbar";
import ThemeProvider from "@/components/ThemeProvider";
import { BRAND_IMAGE, SITE_LOGO_ALT } from "@/lib/brand";
import { getProfileCached } from "@/lib/queries/getProfileCached";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteDescription =
  "Community tools for Amtgard builds, spells, classes, battlegames, monsters, and tiered leaderboards.";

const defaultMetadataBase = "http://localhost:3000";
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : defaultMetadataBase);

export async function generateMetadata(): Promise<Metadata> {
  const profile = await getProfileCached();
  const isLight = profile?.theme_preference === "light";
  const iconPath = isLight ? BRAND_IMAGE.iconLight : BRAND_IMAGE.iconDark;

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: "Metagard",
      template: "%s | Metagard",
    },
    description: siteDescription,
    applicationName: "Metagard",
    icons: {
      icon: [
        {
          url: iconPath,
          type: "image/png",
          sizes: "1024x1024",
        },
      ],
      apple: [
        {
          url: iconPath,
          type: "image/png",
          sizes: "1024x1024",
        },
      ],
      shortcut: iconPath,
    },
    appleWebApp: {
      capable: true,
      title: "Metagard",
      statusBarStyle: "black-translucent",
    },
    openGraph: {
      type: "website",
      siteName: "Metagard",
      title: "Metagard",
      description: siteDescription,
      images: [
        {
          url: BRAND_IMAGE.logoDark,
          width: BRAND_IMAGE.logoWidth,
          height: BRAND_IMAGE.logoHeight,
          alt: SITE_LOGO_ALT,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "Metagard",
      description: siteDescription,
      images: [BRAND_IMAGE.logoDark],
    },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
    { media: "(prefers-color-scheme: light)", color: "#c8c8c8" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const profile = await getProfileCached();
  const initialTheme = profile?.theme_preference === "light" ? "light" : "dark";

  return (
    <html
      lang="en"
      data-theme={initialTheme}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-[var(--background)] text-[var(--foreground)] transition-colors pb-14 lg:pb-0">
        <ThemeProvider initialTheme={initialTheme}>
          <FaviconThemeSync />
          <Navbar />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
