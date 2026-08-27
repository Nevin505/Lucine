import { useCallback, useEffect, useState } from "react";

export function useFetch<T>(fetcher: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetcher());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [fetcher]);

  useEffect(() => {
    let cancelled = false;

     (async () => {
      // Yield so setState isn't synchronous inside the effect body.
      await Promise.resolve();
      if (cancelled) return;

      setLoading(true);
      setError(null);
      try {
        const result = await fetcher();
        if (!cancelled) setData(result);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Request failed");
        setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fetcher]);

  return { data, loading, error, refetch };
}
