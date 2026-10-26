/** Rows fetched for one History page. */
export const PAGE_SIZE = 20;

export interface Page<T> {
  items: T[];
  /** Null when this page is the last. */
  nextCursor: string | null;
}

/**
 * The page after `cursor` in an already sorted list.
 * `cursor` is the previous page's last position. A position that is no longer in the list ends the pages.
 */
export function pageBy<T>(
  items: readonly T[],
  cursor: string | null | undefined,
  limit: number,
  cursorOf: (item: T) => string,
): Page<T> {
  let start = 0;
  if (cursor) {
    const at = items.findIndex((item) => cursorOf(item) === cursor);
    if (at === -1) return { items: [], nextCursor: null };
    start = at + 1;
  }
  const page = items.slice(start, start + limit);
  const last = page[page.length - 1];
  const hasMore = start + page.length < items.length;
  return { items: page, nextCursor: hasMore && last !== undefined ? cursorOf(last) : null };
}
