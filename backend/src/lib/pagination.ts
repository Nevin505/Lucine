/**
 * Cursor pagination — 3 ideas:
 * 1. Cursor = bookmark (sort time + id) encoded as base64.
 * 2. Next page = rows older than the bookmark (newest-first lists).
 * 3. Fetch limit+1 rows; if we got the extra row, hasNextPage = true.
 */

export type PageInfo = {
  hasNextPage: boolean;
  endCursor: string | null;
};

export function encodeCursor(at: Date, id: string): string {
  return Buffer.from(JSON.stringify({ at: at.toISOString(), id })).toString(
    "base64url",
  );
}

export function parseCursor(raw: string): { at: Date; id: string } | null {
  try {
    const data = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as {
      at?: string;
      id?: string;
    };
    if (!data.at || !data.id) return null;
    const at = new Date(data.at);
    if (Number.isNaN(at.getTime())) return null;
    return { at, id: data.id };
  } catch {
    return null;
  }
}

/** Rows that come after the bookmark when sorting newest-first. */
export function rowsAfter(
  field: "cleanedAt" | "createdAt",
  cursor: { at: Date; id: string },
) {
  return {
    OR: [
      { [field]: { lt: cursor.at } },
      { AND: [{ [field]: cursor.at }, { id: { lt: cursor.id } }] },
    ],
  };
}

export function toPage<T>(
  rows: T[],
  limit: number,
  makeCursor: (row: T) => string,
): { items: T[]; pageInfo: PageInfo } {
  const hasNextPage = rows.length > limit;
  const items = hasNextPage ? rows.slice(0, limit) : rows;
  const last = items.at(-1);
  return {
    items,
    pageInfo: {
      hasNextPage,
      endCursor: last ? makeCursor(last) : null,
    },
  };
}
