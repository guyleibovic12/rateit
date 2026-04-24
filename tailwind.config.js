/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/renderer/**/*.{html,ts,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        panel:       "0 1px 3px rgba(15,23,42,0.06), 0 4px 16px rgba(15,23,42,0.04)",
        card:        "0 4px 20px rgba(15,23,42,0.08)",
        "card-hover":"0 8px 32px rgba(79,70,229,0.18), 0 2px 8px rgba(15,23,42,0.06)",
        glow:        "0 0 0 3px rgba(99,102,241,0.18)",
        "inner-sm":  "inset 0 1px 2px rgba(15,23,42,0.06)"
      },
      colors: {
        brand: {
          50:  "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
          950: "#1e1b4b"
        },
        sidebar: {
          bg:     "#0f1117",
          hover:  "#1a1d2e",
          active: "#2d2f6b",
          border: "#1e2030",
          text:   "#94a3b8",
          muted:  "#475569"
        }
      },
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem"
      },
      fontFamily: {
        sans: ["Rubik", "Segoe UI", "Noto Sans Hebrew", "sans-serif"]
      },
      backgroundImage: {
        "gradient-brand": "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
        "gradient-shell": "linear-gradient(160deg, #eef2ff 0%, #e0e7ff 50%, #ede9fe 100%)"
      }
    }
  },
  plugins: []
};
