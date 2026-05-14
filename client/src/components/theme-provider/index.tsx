import { resolvedThemeAtom, themeAtom } from "@/stores/settings";
import { useAtomValue } from "jotai";
import { useEffect, type PropsWithChildren } from "react";

function ThemeProvider({ children }: PropsWithChildren) {
  const theme = useAtomValue(themeAtom);
  const resolvedTheme = useAtomValue(resolvedThemeAtom);

  useEffect(() => {
    const root = window.document.documentElement;

    // Remove both classes first
    root.classList.remove("light", "dark");

    // Add the resolved theme class
    root.classList.add(resolvedTheme);
    root.setAttribute(
      "data-theme",
      resolvedTheme === "dark" ? "mydarktheme" : "mylighttheme",
    );

    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute(
        "content",
        resolvedTheme === "dark" ? "#1e2320" : "#f5fbf7",
      );
    }
  }, [resolvedTheme]);

  // Listen for system theme changes when theme is set to 'system'
  useEffect(() => {
    if (theme !== "system") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = () => {
      const root = window.document.documentElement;
      const newTheme = mediaQuery.matches ? "dark" : "light";
      root.classList.remove("light", "dark");
      root.classList.add(newTheme);
      root.setAttribute(
        "data-theme",
        newTheme === "dark" ? "mydarktheme" : "mylighttheme",
      );
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  return <>{children}</>;
}

export default ThemeProvider;
