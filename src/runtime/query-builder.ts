// query-builder.ts — whitelist-based, no dynamic SQL from user input
const ALLOWED_OPERATORS = ['=', '!=', '>', '<', '>=', '<=', 'LIKE'] as const;
type Op = typeof ALLOWED_OPERATORS[number];

function validateOperator(op: string): Op {
  if (!(ALLOWED_OPERATORS as readonly string[]).includes(op)) throw new Error(`Invalid operator: ${op}`);
  return op as Op;
}

export function buildSelectQuery(table: any, options: any = {}) {
  const { id, limit, cursor, filters = [], sort, order, search, select } = options;
  const tableName = table.name; // from IR, never from user input
  const hiddenCols = new Set(table.hiddenColumns || []);
  const allCols = table.columns.filter((c: any) => !hiddenCols.has(c.name));
  const colNames = select
    ? select.split(',').filter((c: string) => allCols.some((a: any) => a.name === c.trim())).join(', ')
    : allCols.map((c: any) => c.name).join(', ');

  const params: any[] = [];
  let sql = `SELECT ${colNames} FROM ${tableName}`;
  const conditions: string[] = [];

  if (table.softDelete?.enabled) conditions.push(`${table.softDelete.column} IS NULL`);
  if (id !== undefined) { conditions.push(`${table.primaryKey} = ?`); params.push(id); }
  if (cursor) { conditions.push(`${table.primaryKey} > ?`); params.push(atob(cursor)); }
  for (const f of filters) {
    const col = allCols.find((c: any) => c.name === f.column);
    if (!col) continue;
    const op = validateOperator(f.operator || '=');
    conditions.push(`${col.name} ${op} ?`);
    params.push(f.value);
  }
  if (search && table.searchable) {
    const searchCols = allCols.filter((c: any) => c.type === 'TEXT').slice(0, 3);
    if (searchCols.length) {
      conditions.push('(' + searchCols.map((c: any) => `${c.name} LIKE ?`).join(' OR ') + ')');
      searchCols.forEach(() => params.push(`%${search}%`));
    }
  }
  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
  if (sort && table.sortable && allCols.some((c: any) => c.name === sort)) {
    sql += ` ORDER BY ${sort} ${order === 'desc' ? 'DESC' : 'ASC'}`;
  } else {
    sql += ` ORDER BY ${table.primaryKey} ASC`;
  }
  if (limit) { sql += ' LIMIT ?'; params.push(limit); }
  return { sql, params };
}

export function buildInsertQuery(table: any, body: Record<string, any>) {
  const readonlyCols = new Set(table.readonlyColumns || []);
  const allowed = table.columns.filter((c: any) => !c.isPK && !readonlyCols.has(c.name));
  const cols = allowed.filter((c: any) => body[c.name] !== undefined);
  if (!cols.length) throw new Error('No writable columns in body');
  const sql = `INSERT INTO ${table.name} (${cols.map((c: any) => c.name).join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`;
  return { sql, params: cols.map((c: any) => body[c.name]) };
}

export function buildUpdateQuery(table: any, id: string, body: Record<string, any>) {
  const readonlyCols = new Set(table.readonlyColumns || []);
  const allowed = table.columns.filter((c: any) => !c.isPK && !readonlyCols.has(c.name));
  const cols = allowed.filter((c: any) => body[c.name] !== undefined);
  if (!cols.length) throw new Error('No writable columns in body');
  const sql = `UPDATE ${table.name} SET ${cols.map((c: any) => c.name + ' = ?').join(', ')} WHERE ${table.primaryKey} = ?`;
  return { sql, params: [...cols.map((c: any) => body[c.name]), id] };
}
