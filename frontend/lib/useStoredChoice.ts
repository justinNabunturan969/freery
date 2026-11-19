"use client";

import { useEffect, useState } from "react";

/**
 * Remember a visitor's last choice in localStorage so the same view opens
 * again next time.
 */
export function useStoredChoice<T extends string>(
  key: string,
  fallback: T,
): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(fallback);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(key);
      if (stored) setValue(stored as T);
    } catch {
      // Storage can be unavailable in private mode. The fallback is fine.
    }
  }, [key]);

  const update = (next: T) => {
    setValue(next);
    try {
      window.localStorage.setItem(key, next);
    } catch {
      // Ignore storage failures.
    }
  };

  return [value, update];
}
