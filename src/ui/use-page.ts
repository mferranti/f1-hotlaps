import { useCallback, useEffect, useRef, useState } from "react";

import type { Page } from "@/storage/page";

/** Loads the first page when `query` changes, then the next page only while another page exists. */
export function usePage<T, Q extends object>(
  load: (query: Q & { cursor: string | null }) => Promise<Page<T>>,
  query: Q | null,
) {
  const [items, setItems] = useState<T[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const generation = useRef(0);
  const cursorRef = useRef<string | null>(null);
  const loadingMoreRef = useRef(false);

  useEffect(() => {
    const generationAtStart = ++generation.current;
    cursorRef.current = null;
    loadingMoreRef.current = false;
    if (query === null) {
      void Promise.resolve().then(() => {
        if (generationAtStart !== generation.current) return;
        setItems([]);
        setHasMore(false);
        setLoaded(true);
      });
      return;
    }
    let cancelled = false;
    void load({ ...query, cursor: null }).then((page) => {
      if (cancelled || generationAtStart !== generation.current) return;
      cursorRef.current = page.nextCursor;
      setHasMore(page.nextCursor !== null);
      setItems(page.items);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [load, query]);

  const loadMore = useCallback(() => {
    if (query === null || cursorRef.current === null || loadingMoreRef.current) return;
    const generationAtStart = generation.current;
    const cursor = cursorRef.current;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    void load({ ...query, cursor })
      .then((page) => {
        if (generationAtStart !== generation.current) return;
        cursorRef.current = page.nextCursor;
        setHasMore(page.nextCursor !== null);
        setItems((current) => [...current, ...page.items]);
        setLoaded(true);
      })
      .finally(() => {
        if (generationAtStart !== generation.current) return;
        loadingMoreRef.current = false;
        setLoadingMore(false);
      });
  }, [load, query]);

  const refresh = useCallback(async () => {
    const generationAtStart = ++generation.current;
    cursorRef.current = null;
    loadingMoreRef.current = false;
    setRefreshing(true);
    try {
      if (query === null) {
        setItems([]);
        setHasMore(false);
        setLoaded(true);
        return;
      }
      const page = await load({ ...query, cursor: null });
      if (generationAtStart !== generation.current) return;
      cursorRef.current = page.nextCursor;
      setHasMore(page.nextCursor !== null);
      setItems(page.items);
      setLoaded(true);
    } finally {
      if (generationAtStart === generation.current) setRefreshing(false);
    }
  }, [load, query]);

  return { items, hasMore, loadingMore, refreshing, loaded, loadMore, refresh };
}
