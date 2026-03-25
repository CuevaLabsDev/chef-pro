"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type SaveStatus = "idle" | "saving" | "saved" | "offline" | "error";

interface UseAutoSaveOptions {
  url: string;
  method?: string;
  debounceMs?: number;
  localStorageKey?: string;
}

export function useAutoSave<T>(options: UseAutoSaveOptions) {
  const { url, method = "PATCH", debounceMs = 500, localStorageKey } = options;
  const [status, setStatus] = useState<SaveStatus>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestDataRef = useRef<T | null>(null);

  const flush = useCallback(
    async (data: T) => {
      setStatus("saving");
      try {
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) {
          setStatus("error");
          return;
        }
        setStatus("saved");
        if (localStorageKey) {
          try {
            localStorage.removeItem(localStorageKey);
          } catch {}
        }
      } catch {
        setStatus("offline");
        if (localStorageKey) {
          try {
            localStorage.setItem(localStorageKey, JSON.stringify(data));
          } catch {}
        }
      }
    },
    [url, method, localStorageKey]
  );

  const save = useCallback(
    (data: T) => {
      latestDataRef.current = data;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => flush(data), debounceMs);
    },
    [flush, debounceMs]
  );

  useEffect(() => {
    if (!localStorageKey) return;
    const stored = localStorage.getItem(localStorageKey);
    if (stored) {
      try {
        const data = JSON.parse(stored) as T;
        const timer = setTimeout(() => flush(data), 0);
        return () => clearTimeout(timer);
      } catch {}
    }
  }, [localStorageKey, flush]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { save, status };
}
