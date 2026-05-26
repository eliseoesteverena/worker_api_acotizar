import type { Hono } from 'hono';
import { createCRUDHandlers } from './crud';
import { validateJWT } from './auth';

export function registerRoutes(app: Hono<any>, config: any) {
  for (const table of config.tables) {
    if (!table.enabled || table.hidden) continue;

    const path = '/' + table.name;
    const handlers = createCRUDHandlers(table, config);

    app.use(path + '/*', validateJWT(config.auth));

    app.get(path, handlers.list);
    app.get(path + '/:id', handlers.getOne);

    if (!table.readonly && !config.globalReadonly) {
      app.post(path, handlers.create);
      app.patch(path + '/:id', handlers.update);
      app.delete(path + '/:id', handlers.remove);
    }
  }
}
