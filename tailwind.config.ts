import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx,css}",
    "./components/**/*.{ts,tsx,css}"
  ],
  theme: {
    extend: {
      colors: {
        te: {
          black: "var(--te-black)",
          "dark-gray": "var(--te-dark-gray)",
          border: "var(--te-border)",
          gray: "var(--te-gray)",
          "light-gray": "var(--te-light-gray)",
          white: "var(--te-white)",
          orange: "var(--te-orange)",
          red: "var(--te-red)",
        },
      },
      fontFamily: {
        mono: ["SF Mono", "ui-monospace", "Courier New", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;