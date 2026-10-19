/**
 * HARMONIC SAAS - TENANT CONTEXT MIDDLEWARE
 * Module: tenantContext
 *
 * Resolves active tenant from HTTP headers, query params, or subdomains.
 * Injects req.tenant and req.tenantId into the Express request context,
 * and exposes resolveTenant helper for API endpoints.
 */

const db = require('../db');

// Cache tenant profiles in memory to minimize database roundtrips (5 minute TTL)
const tenantCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

function getCachedTenant(key) {
  const cached = tenantCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }
  return null;
}

function setCachedTenant(key, data) {
  tenantCache.set(key, { data, timestamp: Date.now() });
}

async function resolveTenant(identifier) {
  const cleanId = String(identifier || 'default').trim().toLowerCase();

  const cached = getCachedTenant(cleanId);
  if (cached) {
    return cached;
  }

  try {
    const res = await db.query(
      `SELECT tenant_id, name, slug, custom_domain, status, plan_tier, config, created_at
       FROM tenants
       WHERE slug = $1 OR tenant_id = $1 OR custom_domain = $1
       LIMIT 1;`,
      [cleanId]
    );

    let tenant = res.rows[0];

    // Fallback to default tenant if requested slug is not found
    if (!tenant && cleanId !== 'default') {
      const defaultRes = await db.query(
        `SELECT tenant_id, name, slug, custom_domain, status, plan_tier, config, created_at
         FROM tenants
         WHERE slug = 'default' OR tenant_id = 'harmonic-default'
         LIMIT 1;`
      );
      tenant = defaultRes.rows[0];
    }

    if (tenant) {
      setCachedTenant(cleanId, tenant);
      return tenant;
    }
  } catch (err) {
    console.warn('[TENANT-MIDDLEWARE] Database notice resolving tenant:', err.message);
  }

  // Safe fallback if database is offline or during cold boot
  return {
    tenant_id: 'harmonic-default',
    slug: 'default',
    name: 'Harmonic Nightlife Management System',
    status: 'active',
    plan_tier: 'enterprise',
    config: {}
  };
}

async function tenantContextMiddleware(req, res, next) {
  try {
    // 1. Check HTTP header (x-tenant-id or x-tenant-slug)
    let identifier = req.headers['x-tenant-id'] || req.headers['x-tenant-slug'];

    // 2. Check Query parameter (?tenant=... or ?venue=...)
    if (!identifier && req.query) {
      identifier = req.query.tenant || req.query.venue;
    }

    // 3. Check Body parameter if present
    if (!identifier && req.body && typeof req.body === 'object') {
      identifier = req.body.tenant_id || req.body.tenant_slug || req.body.tenant;
    }

    // 4. Check Subdomain from host header
    if (!identifier && req.headers.host) {
      const host = req.headers.host;
      const parts = host.split('.');
      if (parts.length >= 3) {
        const sub = parts[0].toLowerCase();
        const reserved = ['www', 'app', 'api', 'admin', 'dev', 'staging', 'harmonic-web-production'];
        if (!reserved.includes(sub)) {
          identifier = sub;
        }
      }
    }

    // 5. Resolve tenant profile
    const tenant = await resolveTenant(identifier || 'default');
    req.tenant = tenant;
    req.tenantId = tenant.tenant_id;

    // Set response headers for audit and visibility
    res.setHeader('X-Tenant-Id', tenant.tenant_id);
    res.setHeader('X-Tenant-Slug', tenant.slug);
  } catch (err) {
    console.warn('[TENANT-MIDDLEWARE] Fallback tenant triggered:', err.message);
    req.tenant = {
      tenant_id: 'harmonic-default',
      slug: 'default',
      name: 'Harmonic Nightlife Management System'
    };
    req.tenantId = 'harmonic-default';
  }

  next();
}

module.exports = tenantContextMiddleware;
module.exports.resolveTenant = resolveTenant;
