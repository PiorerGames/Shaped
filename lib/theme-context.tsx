import React, { createContext, useContext, useState, useEffect } from "react";
import { useColorScheme } from "react-native";
import {
  MD3DarkTheme,
  MD3LightTheme,
  adaptNavigationTheme,
} from "react-native-paper";
import { MD3Theme } from "react-native-paper/lib/typescript/types";

type ThemeMode = "system" | "light" | "dark" | "highContrast";

interface ThemeContextType {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  theme: MD3Theme;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// High contrast dark theme
const HighContrastTheme: MD3Theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: "#ffffff",
    background: "#000000",
    surface: "#000000",
    surfaceVariant: "#1a1a1a",
    onSurface: "#ffffff",
    onSurfaceVariant: "#ffffff",
    onBackground: "#ffffff",
    elevation: {
      ...MD3DarkTheme.colors.elevation,
      level0: "#000000",
      level1: "#0d0d0d",
      level2: "#1a1a1a",
      level3: "#262626",
      level4: "#333333",
      level5: "#404040",
    },
  },
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeMode] = useState<ThemeMode>("system");
  const systemColorScheme = useColorScheme();

  // Determine the active theme based on themeMode
  const getActiveTheme = (): MD3Theme => {
    if (themeMode === "highContrast") {
      return HighContrastTheme;
    }

    if (themeMode === "light") {
      return MD3LightTheme;
    }

    if (themeMode === "dark") {
      return MD3DarkTheme;
    }

    // System mode: use system preference
    return systemColorScheme === "dark" ? MD3DarkTheme : MD3LightTheme;
  };

  const theme = getActiveTheme();

  return (
    <ThemeContext.Provider value={{ themeMode, setThemeMode, theme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
