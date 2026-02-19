/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        pastelRose: "#FDE8EB",
        pastelLavender: "#EDE7FF",
        pastelMint: "#E8FFF1",
        pastelPeach: "#FFF1E6",
        pastelSky: "#E6F7FF"
      },
      boxShadow: {
        soft: "0 10px 30px rgba(0,0,0,0.06)",
        softMd: "0 12px 40px rgba(0,0,0,0.08)"
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.25rem"
      }
    }
  },
  plugins: []
};


