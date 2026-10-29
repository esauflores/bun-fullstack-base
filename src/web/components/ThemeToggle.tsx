import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

/** Light or dark: the theme's colors follow the `.dark` class on <html> (global.css). */
type Theme = "light" | "dark";

/** Shows a theme and saves it under "theme", the key the head script reads, for the next visit. */
export function saveTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem("theme", theme);
  } catch {}
}

/**
 * Switches between light and dark, and remembers the choice. The server renders it light, as it can't know the theme;
 * once in the browser it reads the one on screen.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");
  /** The theme on screen: void.config.ts's head script set it, from the saved choice or the system's, before paint. */
  useEffect(() => setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light"), []);
  const next = theme === "dark" ? "light" : "dark";

  const toggle = () => {
    saveTheme(next);
    setTheme(next);
  };

  return (
    <button
      type="button"
      aria-label={`Use the ${next} theme`}
      onClick={toggle}
      className="grid size-11 cursor-pointer place-items-center rounded-lg border border-edge text-muted-foreground hover:text-foreground"
    >
      {theme === "dark" ? <Sun className="size-4.5" /> : <Moon className="size-4.5" />}
    </button>
  );
}
