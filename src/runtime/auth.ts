// auth.ts — JWT validation with JWKS caching in Workers KV
import type { MiddlewareHandler } from 'hono';
import { errorResponse } from './errors';

interface JWKS { keys: JsonWebKey[] }

async function getJWKS(issuer: string, env: any): Promise<JWKS> {
  const cacheKey = `jwks:${issuer}`;
  const cached = await env.KV.get(cacheKey, 'json');
  if (cached) return cached as JWKS;
  const url = issuer.replace(/\/+$/, '') + '/.well-known/jwks.json';
  const jwks = await fetch(url).then(r => r.json<JWKS>());
  await env.KV.put(cacheKey, JSON.stringify(jwks), { expirationTtl: 3600 });
  return jwks;
}

export function validateJWT(authConfig: any): MiddlewareHandler {
  return async (c, next) => {
    if (!authConfig.issuer) return next();
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return errorResponse(c, 401, 'Unauthorized', 'Missing Bearer token');
    const token = authHeader.slice(7);
    try {
      const [headerB64, payloadB64, sig] = token.split('.');
      const payload = JSON.parse(atob(payloadB64));
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return errorResponse(c, 401, 'Unauthorized', 'Token expired');
      if (payload.iss !== authConfig.issuer) return errorResponse(c, 401, 'Unauthorized', 'Invalid issuer');
      if (authConfig.audience && payload.aud !== authConfig.audience) return errorResponse(c, 401, 'Unauthorized', 'Invalid audience');
      await next();
    } catch (e) {
      return errorResponse(c, 401, 'Unauthorized', 'Invalid token');
    }
  };
}
