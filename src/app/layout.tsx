import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import FaviconThemeSync from "@/components/FaviconThemeSync";
import Navbar from "@/components/Navbar";
import ThemeProvider from "@/components/ThemeProvider";
import { BRAND_IMAGE, SITE_OG_IMAGE_ALT } from "@/lib/brand";
import { getProfileCached } from "@/lib/queries/getProfileCached";
import { getSiteUrl } from "@/lib/siteUrl";

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

export async function generateMetadata(): Promise<Metadata> {
  const profile = await getProfileCached();
  const isLight = profile?.theme_preference === "light";
  const iconPath = isLight ? BRAND_IMAGE.iconLight : BRAND_IMAGE.iconDark;
  const siteUrl = getSiteUrl();

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
      url: siteUrl,
      images: [
        {
          url: BRAND_IMAGE.ogImage,
          width: BRAND_IMAGE.ogImageWidth,
          height: BRAND_IMAGE.ogImageHeight,
          alt: SITE_OG_IMAGE_ALT,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "Metagard",
      description: siteDescription,
      images: [BRAND_IMAGE.ogImage],
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
      <body className="min-h-full flex flex-col bg-[var(--background)] text-[var(--foreground)] transition-colors pb-[var(--metagard-bottom-nav-pad)]">
        <ThemeProvider initialTheme={initialTheme}>
          <FaviconThemeSync />
          <Navbar />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
