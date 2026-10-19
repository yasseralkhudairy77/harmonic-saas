/**
 * HARMONIC SAAS - ONBOARDING WIZARD CONTROLLER
 * Module: onboardingController
 *
 * Handles self-service tenant onboarding, slug validation, tenant creation,
 * initial owner employee provisioning, and starter master data generation.
 */

const crypto = require('crypto');
const db = require('../db');
const { successResponse, errorResponse } = require('../utils/response');

function hashPin(pin, salt = 'happysong_pos_salt_2026') {
  if (!pin) return '';
  const derivedKey = crypto.scryptSync(String(pin), salt, 64);
  return derivedKey.toString('hex');
}

const RESERVED_SLUGS = new Set([
  'www', 'app', 'api', 'admin', 'default', 'root', 'harmonic', 'system',
  'dev', 'staging', 'test', 'demo', 'help', 'status', 'public'
]);

/**
 * Check if a subdomain slug is available
 */
async function checkSlug(req, res) {
  const rawSlug = String(req.query.slug || '').trim().toLowerCase();
  const slug = rawSlug.replace(/[^a-z0-9-]/g, '');

  if (!slug || slug.length < 3) {
    return errorResponse(res, 'Subdomain minimal 3 karakter (huruf, angka, tanda hubung).', 400);
  }

  if (slug.length > 30) {
    return errorResponse(res, 'Subdomain maksimal 30 karakter.', 400);
  }

  if (RESERVED_SLUGS.has(slug)) {
    return successResponse(res, { available: false, message: 'Subdomain ini dicadangkan untuk sistem.' });
  }

  try {
    const existing = await db.query('SELECT 1 FROM tenants WHERE slug = $1 LIMIT 1;', [slug]);
    if (existing.rowCount > 0) {
      return successResponse(res, { available: false, message: 'Subdomain sudah digunakan oleh venue lain.' });
    }
    return successResponse(res, { available: true, slug, message: 'Subdomain tersedia!' });
  } catch (err) {
    return errorResponse(res, `Gagal memeriksa subdomain: ${err.message}`, 500);
  }
}

/**
 * Create a new SaaS tenant with initial configuration and optional starter data
 */
async function createTenant(req, res) {
  const body = req.body || {};
  const venueName = String(body.venue_name || '').trim();
  const rawSlug = String(body.slug || '').trim().toLowerCase();
  const slug = rawSlug.replace(/[^a-z0-9-]/g, '');

  if (!venueName) {
    return errorResponse(res, 'Nama tempat/venue wajib diisi.', 400);
  }

  if (!slug || slug.length < 3) {
    return errorResponse(res, 'Subdomain minimal 3 karakter.', 400);
  }

  if (RESERVED_SLUGS.has(slug)) {
    return errorResponse(res, 'Subdomain ini dicadangkan untuk sistem.', 400);
  }

  const ownerName = String(body.owner?.name || 'Owner Venue').trim();
  const ownerPin = String(body.owner?.pin || '').trim();

  if (!ownerPin || ownerPin.length < 4) {
    return errorResponse(res, 'PIN Owner minimal 4 digit angka.', 400);
  }

  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Verify slug uniqueness
    const slugCheck = await client.query('SELECT 1 FROM tenants WHERE slug = $1 LIMIT 1;', [slug]);
    if (slugCheck.rowCount > 0) {
      await client.query('ROLLBACK');
      return errorResponse(res, 'Subdomain sudah digunakan. Silakan pilih subdomain lain.', 409);
    }

    const tenantId = `${slug}-${Date.now().toString(36)}`;
    const tenantConfig = {
      tagline: String(body.tagline || 'Nightlife Management System').trim(),
      description: String(body.description || `Sistem operasional dan billing untuk ${venueName}`).trim(),
      branding: {
        theme: {
          accent_color: body.branding?.accent_color || '#e2b85c',
          accent_hover: body.branding?.accent_hover || '#f5c86c',
          accent_glow: body.branding?.accent_glow || 'rgba(226, 184, 92, 0.3)',
          bg_dark: '#08090c',
          card_bg: '#111317'
        }
      },
      operational: {
        timezone: body.operational?.timezone || 'Asia/Jakarta',
        cutoff_hour: Number(body.operational?.cutoff_hour) || 10,
        currency_symbol: 'Rp',
        tax_pb1_percent: Number(body.operational?.tax_pb1_percent) || 10.0,
        service_charge_percent: Number(body.operational?.service_charge_percent) || 5.0,
        pricing_mode: body.operational?.pricing_mode || 'plus_plus',
        grace_period_minutes: Number(body.operational?.grace_period_minutes) || 10
      },
      modules: {
        lady_companion: body.modules?.lady_companion !== false,
        tv_hardware_bridge: Boolean(body.modules?.tv_hardware_bridge),
        kitchen_bar_split_print: Boolean(body.modules?.kitchen_bar_split_print),
        inventory_tracking: true
      },
      terminology: {
        unit_label: body.terminology?.unit_label || 'Ruangan',
        unit_plural: body.terminology?.unit_plural || 'Ruangan',
        unit_prefix: body.terminology?.unit_prefix || 'Room'
      }
    };

    // 2. Insert into tenants table
    await client.query(`
      INSERT INTO tenants (tenant_id, name, slug, status, plan_tier, config)
      VALUES ($1, $2, $3, 'active', 'pro', $4);
    `, [tenantId, venueName, slug, JSON.stringify(tenantConfig)]);

    // 3. Create initial Owner Account in employees table
    const employeeId = `EMP-${slug.toUpperCase()}-01`;
    const pinHashed = hashPin(ownerPin);
    await client.query(`
      INSERT INTO employees (employee_id, employee_name, role, pin, pin_hash, is_active, tenant_id)
      VALUES ($1, $2, 'owner', $3, $4, TRUE, $5);
    `, [employeeId, ownerName, ownerPin, pinHashed, tenantId]);

    // 4. Provision starter data if requested
    const starterOption = body.starter_option || 'starter_demo';
    if (starterOption === 'starter_demo') {
      const prefix = tenantConfig.terminology.unit_prefix || 'Room';
      const unitLabel = tenantConfig.terminology.unit_label || 'Ruangan';

      // Insert 4 Starter Rooms
      const starterRooms = [
        { id: `${slug.toUpperCase()}-01`, name: `${prefix} 01 (${unitLabel} Standard)`, rate: 100000 },
        { id: `${slug.toUpperCase()}-02`, name: `${prefix} 02 (${unitLabel} Deluxe)`, rate: 150000 },
        { id: `${slug.toUpperCase()}-03`, name: `${prefix} 03 (${unitLabel} Executive)`, rate: 200000 },
        { id: `${slug.toUpperCase()}-VIP`, name: `${prefix} VIP Suite`, rate: 350000 },
      ];

      for (const r of starterRooms) {
        await client.query(`
          INSERT INTO rooms (room_id, room_name, status, rate_per_hour, tenant_id)
          VALUES ($1, $2, 'available', $3, $4)
          ON CONFLICT (room_id) DO NOTHING;
        `, [r.id, r.name, r.rate, tenantId]);
      }

      // Insert 4 Starter Menu Items
      const starterMenu = [
        { id: `MENU-${slug.toUpperCase()}-01`, name: 'Beer Bintang Pint', category: 'Beverage', price: 45000, hpp: 28000 },
        { id: `MENU-${slug.toUpperCase()}-02`, name: 'Snack Platter Combo', category: 'Food', price: 55000, hpp: 25000 },
        { id: `MENU-${slug.toUpperCase()}-03`, name: 'Mineral Water 600ml', category: 'Beverage', price: 15000, hpp: 5000 },
        { id: `MENU-${slug.toUpperCase()}-04`, name: 'Ice Lemon Tea Pitcher', category: 'Beverage', price: 35000, hpp: 12000 },
      ];

      for (const m of starterMenu) {
        await client.query(`
          INSERT INTO menu (menu_id, menu_name, category, price, hpp, status, tenant_id)
          VALUES ($1, $2, $3, $4, $5, 'active', $6)
          ON CONFLICT (menu_id) DO NOTHING;
        `, [m.id, m.name, m.category, m.price, m.hpp, tenantId]);
      }
    }

    await client.query('COMMIT');

    console.log(`[ONBOARDING] Tenant baru berhasil dibuat: ${tenantId} (${slug}) - ${venueName}`);

    return successResponse(res, {
      tenant_id: tenantId,
      slug,
      name: venueName,
      owner_employee_id: employeeId,
      redirect_url: `/?tenant=${encodeURIComponent(slug)}`,
      message: 'Venue baru berhasil didaftarkan dan diinisialisasi!'
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[ONBOARDING] Error saat membuat tenant baru:', err.message);
    return errorResponse(res, `Gagal mendaftarkan venue: ${err.message}`, 500);
  } finally {
    client.release();
  }
}

module.exports = {
  checkSlug,
  createTenant,
};
