import { useEffect, useState } from "react";
import { errorKey } from "./chain";
export function useLoad<T>(
  key: string,
  loader: () => Promise<T>,
  enabled = true,
  poll = 0,
) {
  const [s, set] = useState<{
    key: string;
    data?: T;
    error?: string;
    loading: boolean;
  }>({ key, loading: enabled });
  useEffect(() => {
    let live = true,
      running = false;
    set({ key, loading: enabled });
    if (!enabled) return;
    async function load() {
      if (running) return;
      running = true;
      try {
        const data = await loader();
        if (live) set({ key, data, loading: false });
      } catch (e) {
        if (live) set({ key, error: errorKey(e), loading: false });
      } finally {
        running = false;
      }
    }
    void load();
    const timer = poll ? setInterval(load, poll) : undefined;
    const focus = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", focus);
    return () => {
      live = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", focus);
    };
  }, [key, enabled, poll]);
  return s.key === key
    ? s
    : { key, data: undefined, error: undefined, loading: enabled };
}
