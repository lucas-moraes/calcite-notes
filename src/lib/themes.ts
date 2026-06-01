export type ThemePreset = "gruvbox" | "nord" | "lime" | "tokyo-night" | "fuchsia" | "rose";
export type ThemeMode = "dark" | "light";

export interface ThemeColors {
  base950: string;
  base900: string;
  base800: string;
  base700: string;
  base600: string;
  base500: string;
  base400: string;
  base300: string;
  base200: string;
  base100: string;
  base: string;
  accent: string;
}

export interface ThemeDefinition {
  id: ThemePreset;
  label: string;
  dark: ThemeColors;
  light: ThemeColors;
}

export const themes: ThemeDefinition[] = [
  {
    id: "gruvbox",
    label: "Gruvbox",
    dark: {
      base950: "#0c0906",
      base900: "#15120e",
      base800: "#1f1a14",
      base700: "#2c251a",
      base600: "#40331f",
      base500: "#5c4a2e",
      base400: "#8a6f47",
      base300: "#b89768",
      base200: "#e0c28f",
      base100: "#f5e6d0",
      base: "#faf5ec",
      accent: "#d97706",
    },
    light: {
      base950: "#faf5ec",
      base900: "#f5e6d0",
      base800: "#e0c28f",
      base700: "#b89768",
      base600: "#8a6f47",
      base500: "#5c4a2e",
      base400: "#40331f",
      base300: "#2c251a",
      base200: "#1f1a14",
      base100: "#15120e",
      base: "#0c0906",
      accent: "#d97706",
    },
  },
  {
    id: "nord",
    label: "Nord",
    dark: {
      base950: "#2e3440",
      base900: "#3b4252",
      base800: "#434c5e",
      base700: "#4c566a",
      base600: "#616e88",
      base500: "#81a1c1",
      base400: "#88c0d0",
      base300: "#8fbcbb",
      base200: "#a3be8c",
      base100: "#e5e9f0",
      base: "#eceff4",
      accent: "#ebcb8b",
    },
    light: {
      base950: "#eceff4",
      base900: "#e5e9f0",
      base800: "#d8dce4",
      base700: "#bcc2d0",
      base600: "#9aa2b8",
      base500: "#616e88",
      base400: "#4c566a",
      base300: "#3b4252",
      base200: "#2e3440",
      base100: "#242933",
      base: "#1a1e26",
      accent: "#d08770",
    },
  },
  {
    id: "lime",
    label: "Lime",
    dark: {
      base950: "#0f1a0a",
      base900: "#172010",
      base800: "#1f2a14",
      base700: "#2a3a1a",
      base600: "#3d5220",
      base500: "#5a7a30",
      base400: "#7aa040",
      base300: "#9ec450",
      base200: "#c2e060",
      base100: "#e0f0a0",
      base: "#f0f8d0",
      accent: "#84cc16",
    },
    light: {
      base950: "#f0f8d0",
      base900: "#e0f0a0",
      base800: "#c2e060",
      base700: "#9ec450",
      base600: "#7aa040",
      base500: "#5a7a30",
      base400: "#3d5220",
      base300: "#2a3a1a",
      base200: "#1f2a14",
      base100: "#172010",
      base: "#0f1a0a",
      accent: "#65a30d",
    },
  },
  {
    id: "tokyo-night",
    label: "Tokyo Night",
    dark: {
      base950: "#1a1b26",
      base900: "#16161e",
      base800: "#1f2335",
      base700: "#24283b",
      base600: "#2f3549",
      base500: "#565f89",
      base400: "#737aa2",
      base300: "#a9b1d6",
      base200: "#c0caf5",
      base100: "#d5d9e3",
      base: "#e2e4eb",
      accent: "#7aa2f7",
    },
    light: {
      base950: "#e2e4eb",
      base900: "#d5d9e3",
      base800: "#c0caf5",
      base700: "#a9b1d6",
      base600: "#7aa2f7",
      base500: "#565f89",
      base400: "#3b4261",
      base300: "#2f3549",
      base200: "#24283b",
      base100: "#1a1b26",
      base: "#0f111a",
      accent: "#2f5cf0",
    },
  },
  {
    id: "fuchsia",
    label: "Fuchsia",
    dark: {
      base950: "#1a0a14",
      base900: "#24101e",
      base800: "#2e1428",
      base700: "#3e1c38",
      base600: "#54284e",
      base500: "#7a3870",
      base400: "#a04890",
      base300: "#c860b8",
      base200: "#e088d4",
      base100: "#f0b8e8",
      base: "#f8d8f4",
      accent: "#d946ef",
    },
    light: {
      base950: "#f8d8f4",
      base900: "#f0b8e8",
      base800: "#e088d4",
      base700: "#c860b8",
      base600: "#a04890",
      base500: "#7a3870",
      base400: "#54284e",
      base300: "#3e1c38",
      base200: "#2e1428",
      base100: "#24101e",
      base: "#1a0a14",
      accent: "#c026d3",
    },
  },
  {
    id: "rose",
    label: "Rose",
    dark: {
      base950: "#1a0a0e",
      base900: "#241014",
      base800: "#2e141c",
      base700: "#3e1c28",
      base600: "#542838",
      base500: "#7a3850",
      base400: "#a04868",
      base300: "#c86080",
      base200: "#e088a0",
      base100: "#f0b8c8",
      base: "#f8d8e0",
      accent: "#f43f5e",
    },
    light: {
      base950: "#f8d8e0",
      base900: "#f0b8c8",
      base800: "#e088a0",
      base700: "#c86080",
      base600: "#a04868",
      base500: "#7a3850",
      base400: "#542838",
      base300: "#3e1c28",
      base200: "#2e141c",
      base100: "#241014",
      base: "#1a0a0e",
      accent: "#e11d48",
    },
  },
];

export function setThemeColors(preset: ThemePreset, mode: ThemeMode) {
  const theme = themes.find((t) => t.id === preset);
  if (!theme) return;
  const colors = mode === "dark" ? theme.dark : theme.light;
  const root = document.documentElement;
  root.style.setProperty("--color-base-950", colors.base950);
  root.style.setProperty("--color-base-900", colors.base900);
  root.style.setProperty("--color-base-800", colors.base800);
  root.style.setProperty("--color-base-700", colors.base700);
  root.style.setProperty("--color-base-600", colors.base600);
  root.style.setProperty("--color-base-500", colors.base500);
  root.style.setProperty("--color-base-400", colors.base400);
  root.style.setProperty("--color-base-300", colors.base300);
  root.style.setProperty("--color-base-200", colors.base200);
  root.style.setProperty("--color-base-100", colors.base100);
  root.style.setProperty("--color-base", colors.base);
  root.style.setProperty("--color-accent", colors.accent);
  root.classList.toggle("light", mode === "light");
  root.classList.toggle("dark", mode === "dark");
}
