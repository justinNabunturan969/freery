import type { Config } from "tailwindcss";

/**
 * Design tokens sampled from the six reference screens in section 4.5 of the
 * Freery Public Web App Project Brief (apps/public-web/public/reference).
 *
 *   page background  #F5F8FA   soft gray-green
 *   card             #FFFFFF
 *   route panel      #EEF6F6
 *   primary teal     #087E83   buttons, selected station dots, links
 *   emphasis dark    #182F3E   role card, closing CTA, footer
 *   route line       #93C2C2   station dot ring #C0DCDC
 *
 * The ink shades are graded so that every text colour clears the WCAG AA
 * contrast ratio of 4.5 to 1 against white, the route panel and the page
 * background. ink.faint is the lightest step and is the first one that
 * still passes.
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#1F3243",
          strong: "#142B3A",
          muted: "#4C5F6D",
          faint: "#5B6E7C",
        },
        page: {
          DEFAULT: "#F5F8FA",
          tint: "#EEF6F6",
        },
        line: {
          DEFAULT: "#E3EAED",
          strong: "#C0DCDC",
        },
        brand: {
          50: "#EEF6F6",
          100: "#D9EBEB",
          200: "#B7D7D8",
          300: "#93C2C2",
          400: "#4FA3A6",
          500: "#087E83",
          600: "#066A6F",
          700: "#05565A",
          800: "#04454A",
          900: "#0E2636",
        },
        navy: {
          DEFAULT: "#182F3E",
          soft: "#22384A",
        },
        ferry: {
          /**
           * Ferry identity colours. The solid values are the ones sampled
           * from the reference screens and are used for the markers, the
           * icons and the seat bars, where the 3 to 1 non text rule applies.
           * The "text" shade of each is a darker step of the same hue, used
           * wherever the colour carries words, so it clears 4.5 to 1.
           */
          1: "#C2611C",
          2: "#7C3AED",
          3: "#0E9F6E",
          4: "#64748B",
          5: "#1D4ED8",
          6: "#BE185D",
        },
        "ferry-text": {
          1: "#9C4A0B",
          2: "#6D28D9",
          3: "#07805A",
          4: "#556274",
          5: "#1E40AF",
          6: "#9D174D",
        },
        /**
         * The lighter step of each ferry hue, used where the colour carries
         * words on the dark landing preview card.
         */
        "ferry-dark": {
          1: "#F0A868",
          2: "#C4A5FB",
          3: "#4ADE9E",
          4: "#CBD5E1",
          5: "#93C5FD",
          6: "#F9A8D4",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(20, 43, 58, 0.04), 0 1px 3px rgba(20, 43, 58, 0.03)",
        lift: "0 8px 24px rgba(20, 43, 58, 0.10)",
        chip: "0 6px 18px rgba(20, 43, 58, 0.08)",
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.125rem",
      },
      maxWidth: {
        shell: "1180px",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.45" },
        },
      },
      animation: {
        "fade-in": "fade-in 240ms ease-out both",
        "pulse-soft": "pulse-soft 1.8s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
