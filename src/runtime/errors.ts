// errors.ts — RFC 7807 Problem Details
import type { Context } from 'hono';

export function errorResponse(c: Context, status: number, title: string, detail: string) {
  return c.json({ type: `https://errors.example.com/${title.toLowerCase().replace(/\s+/g, '-')}`, title, status, detail, instance: c.req.path }, status as any);
}
