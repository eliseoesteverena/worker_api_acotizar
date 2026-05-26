import { Hono } from 'hono';
import { registerRoutes } from './runtime/routes';
import { registerDocsRoutes } from './runtime/docs';
import config from './generated-config.json';

export interface Env {
  DB: D1Database;
  KV: KVNamespace;
}

const app = new Hono<{ Bindings: Env }>();

// CORS preflight
app.options('*', (c) => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin':  config.cors.origins.join(', ') || '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Max-Age':       '86400',
    },
  });
});

// Register all CRUD routes from config
registerRoutes(app, config);

// Register /docs + /docs/openapi.json (Scalar via CDN)
registerDocsRoutes(app, config);

export default app;
