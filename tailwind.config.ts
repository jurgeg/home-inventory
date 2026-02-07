import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        slate_blue: "#4A6FA5",
        warm_white: "#FAF9F6",
      },
    },
  },
  plugins: [],
};
export default config;
