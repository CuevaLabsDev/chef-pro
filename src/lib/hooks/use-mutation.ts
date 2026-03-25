"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { mutate } from "swr";

interface MutationOptions {
  successMessage?: string;
  invalidateKeys?: string[];
  onSuccess?: () => void;
}

export function useMutation(options?: MutationOptions) {
  const [loading, setLoading] = useState(false);

  const trigger = useCallback(
    async (url: string, method: string, body?: unknown) => {
      setLoading(true);
      try {
        const res = await fetch(url, {
          method,
          headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
          body: body !== undefined ? JSON.stringify(body) : undefined,
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          toast.error(data.error ?? "Something went wrong");
          return null;
        }

        const data = await res.json().catch(() => null);

        if (options?.successMessage) {
          toast.success(options.successMessage);
        }

        if (options?.invalidateKeys) {
          await Promise.all(options.invalidateKeys.map((key) => mutate(key)));
        }

        options?.onSuccess?.();
        return data;
      } catch {
        toast.error("Network error");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [options]
  );

  return { trigger, loading };
}
