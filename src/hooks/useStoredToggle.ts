import { useCallback, useState } from "react";

/** Boolean preference remembered on this device (falls back silently if storage is unavailable). */
export function useStoredToggle(key: string, initial: boolean): [boolean, () => void] {
  const [value, setValue] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem(key);
      return v === null ? initial : v === "1";
    } catch {
      return initial;
    }
  });
  const toggle = useCallback(() => {
    setValue((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(key, next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  }, [key]);
  return [value, toggle];
}
