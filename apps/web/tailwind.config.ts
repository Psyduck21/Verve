import type { Config } from "tailwindcss"
import { fontFamily } from "tailwindcss/defaultTheme"

const config: Config = {
    darkMode: ["class"],
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ["var(--font-geist-sans)", ...fontFamily.sans],
                mono: ["var(--font-geist-mono)", ...fontFamily.mono],
            },
            colors: {
                // shadcn/ui CSS variable tokens mapped to premium dark mode defaults
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                card: {
                    DEFAULT: "hsl(var(--card))",
                    foreground: "hsl(var(--card-foreground))",
                },
                popover: {
                    DEFAULT: "hsl(var(--popover))",
                    foreground: "hsl(var(--popover-foreground))",
                },
                primary: {
                    DEFAULT: "hsl(var(--primary))",
                    foreground: "hsl(var(--primary-foreground))",
                },
                secondary: {
                    DEFAULT: "hsl(var(--secondary))",
                    foreground: "hsl(var(--secondary-foreground))",
                },
                muted: {
                    DEFAULT: "hsl(var(--muted))",
                    foreground: "hsl(var(--muted-foreground))",
                },
                accent: {
                    DEFAULT: "hsl(var(--accent))",
                    foreground: "hsl(var(--accent-foreground))",
                },
                destructive: {
                    DEFAULT: "hsl(var(--destructive))",
                    foreground: "hsl(var(--destructive-foreground))",
                },
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                // Focal semantic tokens
                sidebar: {
                    DEFAULT: "hsl(var(--sidebar-bg))",
                    border: "hsl(var(--sidebar-border))",
                    item: "hsl(var(--sidebar-item))",
                    "item-active": "hsl(var(--sidebar-item-active))",
                },
                // Refined Category tag colors
                tag: {
                    work: { bg: "hsl(var(--tag-work-bg))", text: "hsl(var(--tag-work-text))" },
                    personal: { bg: "hsl(var(--tag-personal-bg))", text: "hsl(var(--tag-personal-text))" },
                    health: { bg: "hsl(var(--tag-health-bg))", text: "hsl(var(--tag-health-text))" },
                    learning: { bg: "hsl(var(--tag-learning-bg))", text: "hsl(var(--tag-learning-text))" },
                },
                status: {
                    todo: "hsl(var(--status-todo))",
                    progress: "hsl(var(--status-progress))",
                    review: "hsl(var(--status-review))",
                    done: "hsl(var(--status-done))",
                },
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
                xl: "calc(var(--radius) + 4px)",
                "2xl": "calc(var(--radius) + 8px)",
                island: "12px",
                pill: "9999px",
            },
            boxShadow: {
                // Multi-layered diffused shadows for premium depth in Light Mode
                subtle: "0 1px 2px 0 rgba(0, 0, 0, 0.03)",
                island: "0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 0 3px 0 rgba(0, 0, 0, 0.02)",
                "island-md": "0 8px 24px -4px rgba(0, 0, 0, 0.06), 0 0 4px 0 rgba(0, 0, 0, 0.03)",
                "island-lg": "0 12px 32px -8px rgba(0, 0, 0, 0.08), 0 0 8px 0 rgba(0, 0, 0, 0.04)",
                "card-hover": "0 12px 32px -4px rgba(0, 0, 0, 0.08), 0 4px 12px -2px rgba(0, 0, 0, 0.04)",
                glow: "0 0 20px 0 hsl(var(--primary) / 0.15), 0 0 0 1px hsl(var(--primary) / 0.2)",
            },
            keyframes: {
                // Skeleton shimmer
                shimmer: {
                    "0%": { backgroundPosition: "-200% 0" },
                    "100%": { backgroundPosition: "200% 0" },
                },
                // Notification pulse
                "ping-sm": {
                    "0%, 100%": { transform: "scale(1)", opacity: "1" },
                    "50%": { transform: "scale(1.3)", opacity: "0.8" },
                },
                // Accordion
                "accordion-down": {
                    from: { height: "0" },
                    to: { height: "var(--radix-accordion-content-height)" },
                },
                "accordion-up": {
                    from: { height: "var(--radix-accordion-content-height)" },
                    to: { height: "0" },
                },
                // Fade in up
                "fade-in-up": {
                    from: { opacity: "0", transform: "translateY(8px)" },
                    to: { opacity: "1", transform: "translateY(0)" },
                },
            },
            animation: {
                shimmer: "shimmer 2s linear infinite",
                "ping-sm": "ping-sm 2s ease-in-out infinite",
                "accordion-down": "accordion-down 0.2s ease-out",
                "accordion-up": "accordion-up 0.2s ease-out",
                "fade-in-up": "fade-in-up 0.3s ease-out",
            },
            // Sidebar widths
            width: {
                "sidebar-rail": "56px",
                "sidebar-compact": "200px",
                "sidebar-full": "260px",
            },
        },
    },
    plugins: [
        require("@tailwindcss/forms"),
        require("@tailwindcss/container-queries"),
    ],
}

export default config
