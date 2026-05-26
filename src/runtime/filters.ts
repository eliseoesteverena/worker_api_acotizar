// filters.ts — safe filter parsing from query params
export function parseFilters(query: Record<string, string>, table: any): { column: string; operator: string; value: string }[] {
  if (!table.filterable) return [];
  const colNames = new Set(table.columns.map((c: any) => c.name));
  const hiddenCols = new Set(table.hiddenColumns || []);
  return Object.entries(query)
    .filter(([k]) => k.startsWith('filter[') && k.endsWith(']'))
    .map(([k, v]) => {
      const col = k.slice(7, -1);
      if (!colNames.has(col) || hiddenCols.has(col)) return null;
      return { column: col, operator: '=', value: v };
    })
    .filter(Boolean) as any[];
}
