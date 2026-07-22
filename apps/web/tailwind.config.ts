import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ["Geist", "Inter", "Segoe UI", "system-ui", "sans-serif"] },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))", subtle: "hsl(var(--primary-subtle))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        success: { DEFAULT: "hsl(var(--success))", subtle: "hsl(var(--success-subtle))" },
        warning: { DEFAULT: "hsl(var(--warning))", subtle: "hsl(var(--warning-subtle))" }
      },
      borderRadius: { xl: "var(--radius)", "2xl": "calc(var(--radius) + 4px)" },
      boxShadow: {
        soft: "0 1px 2px rgba(16,24,40,.035), 0 8px 24px rgba(16,24,40,.045)",
        drawer: "-24px 0 64px rgba(8,18,28,.18)"
      },
      keyframes: {
        shimmer: { "0%": { backgroundPosition: "200% 0" }, "100%": { backgroundPosition: "-200% 0" } },
        "fade-up": { "0%": { opacity: "0", transform: "translateY(8px)" }, "100%": { opacity: "1", transform: "translateY(0)" } }
      },
      animation: { shimmer: "shimmer 1.7s linear infinite", "fade-up": "fade-up .35s ease-out both" }
    }
  },
  plugins: []
} satisfies Config;
