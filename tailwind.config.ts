import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // GAVINHO-aligned editorial palette
        cream: "#F2F0E7",
        beige: "#ADAA96",
        olive: "#8B8670",
        charcoal: "#1F1F1C",
        muted: "#6F6C60",
        // functional, restrained accents derived from the palette
        line: "#D8D5C8",
        "line-strong": "#C5C1B0",
        surface: "#F7F6EF",
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Cormorant Garamond", "Georgia", "serif"],
        sans: [
          "var(--font-sans)",
          "Quattrocento Sans",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
      },
      letterSpacing: {
        editorial: "0.18em",
      },
      maxWidth: {
        atelier: "1240px",
      },
    },
  },
  plugins: [],
};

export default config;
