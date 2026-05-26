// docs.ts — /docs con Scalar UI (CDN) + /docs/openapi.json
import type { Hono } from 'hono';
import openApiSpec from '../openapi.json';

export function registerDocsRoutes(app: Hono<any>, config: any) {
  if (!config.docs?.enabled) return;

  const requiresAuth = config.docs?.auth === 'protected';

  app.get('/docs/openapi.json', async (c) => {
    if (requiresAuth) {
      const auth = c.req.header('Authorization');
      if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
    }
    return c.json(openApiSpec);
  });

  app.get('/docs', async (c) => {
    if (requiresAuth) {
      const auth = c.req.header('Authorization');
      if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
    }
    return c.html(`<!DOCTYPE html>
<html>
  <head>
    <title>${config.database?.name || 'API'} — Docs</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <script
      id="api-reference"
      data-url="/docs/openapi.json"
      src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>`);
  });
}
