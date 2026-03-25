"use client";

import useSWR, { type SWRConfiguration } from "swr";

export const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.error || res.statusText);
    (err as unknown as Record<string, unknown>).status = res.status;
    throw err;
  }
  return res.json();
};

export function useApi<T>(url: string | null, config?: SWRConfiguration) {
  return useSWR<T>(url, fetcher, config);
}
