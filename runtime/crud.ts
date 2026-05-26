import type { Context } from 'hono';
import { buildSelectQuery, buildInsertQuery, buildUpdateQuery } from './query-builder';
import { parsePagination, buildCursorResponse } from './pagination';
import { parseFilters } from './filters';
import { errorResponse } from './errors';

export function createCRUDHandlers(table: any, config: any) {
  return {
    async list(c: Context) {
      const db = c.env.DB;
      const { limit, cursor } = parsePagination(c.req.query(), config.pagination);
      const filters = parseFilters(c.req.query(), table);
      const { sql, params } = buildSelectQuery(table, { limit: limit + 1, cursor, filters,
        sort: c.req.query('sort'), order: c.req.query('order'),
        search: c.req.query('search'), select: c.req.query('select') });
      const rows = await db.prepare(sql).bind(...params).all();
      return c.json(buildCursorResponse(rows.results, limit, table.primaryKey));
    },
    async getOne(c: Context) {
      const db = c.env.DB;
      const id = c.req.param('id');
      const { sql, params } = buildSelectQuery(table, { id });
      const row = await db.prepare(sql).bind(...params).first();
      if (!row) return errorResponse(c, 404, 'Not Found', `${table.name}/${id} not found`);
      if (table.softDelete?.enabled && row[table.softDelete.column]) return errorResponse(c, 404, 'Not Found', 'Resource deleted');
      return c.json(row);
    },
    async create(c: Context) {
      const db = c.env.DB;
      const body = await c.req.json().catch(() => null);
      if (!body) return errorResponse(c, 400, 'Bad Request', 'Invalid JSON body');
      const { sql, params } = buildInsertQuery(table, body);
      const result = await db.prepare(sql).bind(...params).run();
      return c.json({ id: result.meta.last_row_id }, 201);
    },
    async update(c: Context) {
      const db = c.env.DB;
      const id = c.req.param('id');
      const body = await c.req.json().catch(() => null);
      if (!body) return errorResponse(c, 400, 'Bad Request', 'Invalid JSON body');
      const { sql, params } = buildUpdateQuery(table, id, body);
      await db.prepare(sql).bind(...params).run();
      return c.json({ updated: true });
    },
    async remove(c: Context) {
      const db = c.env.DB;
      const id = c.req.param('id');
      if (table.softDelete?.enabled) {
        const sql = `UPDATE ${table.name} SET ${table.softDelete.column} = CURRENT_TIMESTAMP WHERE ${table.primaryKey} = ?`;
        await db.prepare(sql).bind(id).run();
      } else {
        const sql = `DELETE FROM ${table.name} WHERE ${table.primaryKey} = ?`;
        await db.prepare(sql).bind(id).run();
      }
      return c.json({ deleted: true });
    },
  };
}
