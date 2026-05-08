"use client";

import { useEffect } from "react";

type Theme = "dark" | "light";

export default function ThemeProvider({
  initialTheme,
  children,
}: {
  initialTheme: Theme;
  children: React.ReactNode;
}) {
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", initialTheme);
  }, [initialTheme]);

  return <>{children}</>;
}
