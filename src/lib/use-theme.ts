"use client";
import { useMemo } from "react";

export function useTheme() {
  return useMemo(() => ({
    isDark: false,
    toggleTheme: () => {},
  }), []);
}
