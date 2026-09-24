import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    screens: {
      'xs': '475px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    extend: {
      fontFamily: {
        // UP Design v1: Plus Jakarta Sans for body, Unbounded for headings/figures.
        sans: ["var(--font-up-body)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-up-display)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      fontSize: {
        "display-lg": ["2.25rem", { lineHeight: "1.2", letterSpacing: "-0.02em" }],
        "display-md": ["1.875rem", { lineHeight: "1.25", letterSpacing: "-0.02em" }],
        "display-sm": ["1.5rem", { lineHeight: "1.3", letterSpacing: "-0.02em" }],
        "body-lg": ["1.125rem", { lineHeight: "1.6" }],
        "body": ["1rem", { lineHeight: "1.6" }],
        "body-sm": ["0.875rem", { lineHeight: "1.5" }],
        "caption": ["0.8125rem", { lineHeight: "1.4" }],
        "overline": ["0.75rem", { lineHeight: "1.4", letterSpacing: "0.04em" }],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        page: "hsl(var(--page))",
        surface: "hsl(var(--surface))",
        "surface-elevated": "hsl(var(--surface-elevated))",
        "surface-overlay": "hsl(var(--surface-overlay))",
        "content-primary": "hsl(var(--text-primary))",
        "content-secondary": "hsl(var(--text-secondary))",
        "content-muted": "hsl(var(--text-muted))",
        "border-default": "hsl(var(--border-default))",
        "border-subtle": "hsl(var(--border-subtle))",
        // UP raw tokens (app/globals.css). Full values, so no `/opacity` on these.
        up: {
          navy: "var(--up-navy)",
          "navy-subtle": "var(--up-navy-subtle)",
          "on-navy": "var(--up-on-navy)",
          "on-navy-muted": "var(--up-on-navy-muted)",
          "on-navy-faint": "var(--up-on-navy-faint)",
          "border-on-navy": "var(--up-border-on-navy)",
          orange: "var(--up-orange)",
          "orange-ink": "var(--up-orange-ink)",
          "orange-tint": "var(--up-orange-tint)",
          lime: "var(--up-lime)",
          "lime-tint": "var(--up-lime-tint)",
          "lime-ink": "var(--up-lime-ink)",
          fill: "var(--up-fill-subtle)",
          hairline: "var(--up-hairline)",
          sep: "var(--up-sep)",
          "border-hover": "var(--up-border-hover)",
          bar: "var(--up-bar-bg)",
          solid: "var(--up-solid)",
          "on-solid": "var(--up-on-solid)",
          lead: "var(--up-lead)",
        },
        "brand-orange": "#ff6700",
        "brand-blue": "#0b1222",
        "orange": {
          DEFAULT: "hsl(var(--orange))",
          light: "hsl(var(--orange-light))",
          dark: "hsl(var(--orange-dark))",
          muted: "hsl(var(--orange-muted))",
        },
        "accent-cyan": {
          DEFAULT: "hsl(var(--primary))",
          light: "hsl(var(--orange-light))",
          dark: "hsl(var(--orange-dark))",
          muted: "hsl(var(--orange-muted))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        // UP radii: 12 / 14 / 18 / 20
        "up-sm": "12px",
        "up-md": "14px",
        "up-lg": "18px",
        "up-xl": "20px",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
export default config
