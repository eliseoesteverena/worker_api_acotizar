// pagination.ts — cursor-based pagination
export function parsePagination(query: Record<string, string>, config: any) {
  const limit = Math.min(parseInt(query.limit || config.defaultLimit) || config.defaultLimit, config.maxLimit);
  const cursor = query.cursor ? atob(query.cursor) : null;
  return { limit, cursor };
}

export function buildCursorResponse(rows: any[], limit: number, pkField: string) {
  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? btoa(String(data[data.length - 1][pkField])) : null;
  return { data, pagination: { limit, nextCursor, hasMore } };
}
