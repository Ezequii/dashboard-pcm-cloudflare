import * as React from "react";

type Theme = "light" | "dark";
const ThemeContext = React.createContext<{ theme: Theme; toggle: () => void }>({ theme: "light", toggle: () => undefined });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = React.useState<Theme>(() => {
    const saved = localStorage.getItem("pcm-theme") as Theme | null;
    if (saved) return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  React.useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("pcm-theme", theme);
  }, [theme]);
  const value = React.useMemo(() => ({ theme, toggle: () => setTheme((t) => t === "dark" ? "light" : "dark") }), [theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
export function useTheme() { return React.useContext(ThemeContext); }
