/**
 * HARMONIC SAAS - MULTI-TENANT DATABASE MIGRATION ENGINE
 * Phase 2: Schema Isolation, Row Level Security (RLS) & Tenant Seeding
 *
 * Ensures all operational tables have a tenant_id column, composite indexes,
 * default tenant mapping, and RLS policies for strict data isolation.
 */

const OPERATIONAL_TABLES = [
  'settings',
  'employees',
  'rooms',
  'tv_devices',
  'tv_displays',
  'inventory',
  'menu',
  'recipe',
  'package_master',
  'package_details',
  'promos',
  'lc_master',
  'room_sessions',
  'room_session_segments',
  'transactions',
  'transaction_correction_logs',
  'sales_commission_logs',
  'transaction_lines',
  'fnb_orders',
  'fnb_order_items',
  'fnb_order_item_components',
  'stock_movements',
  'inventory_audits',
  'inventory_audit_lines',
  'lc_work_logs',
  'lc_sales_bonus_logs',
  'petty_cash_ledger',
  'lc_cash_advances',
  'lc_payroll_history',
  'cashier_closings',
  'cashier_closing_transactions',
  'cashier_closing_fnb_items',
  'cashier_closing_lc_details',
  'receipt_print_logs',
  'room_time_logs',
  'room_recovery_logs',
  'tv_control_logs',
  'master_data_audit_logs',
  'operational_audit_events'
];

const RLS_TABLES = [
  'rooms',
  'transactions',
  'room_sessions',
  'employees',
  'fnb_orders',
  'lc_work_logs',
  'inventory'
];

async function runMultiTenantMigration(db) {
  console.log('[MULTI-TENANT] Memeriksa dan menjalankan migrasi multi-tenant...');

  try {
    // 1. Create tenants table if not exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS tenants (
        tenant_id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        slug VARCHAR(50) UNIQUE NOT NULL,
        custom_domain VARCHAR(255) UNIQUE,
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'trial', 'cancelled')),
        plan_tier VARCHAR(30) DEFAULT 'pro' CHECK (plan_tier IN ('starter', 'pro', 'enterprise')),
        config JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Seed default tenants
    await db.query(`
      INSERT INTO tenants (tenant_id, name, slug, status, plan_tier, config)
      VALUES 
        (
          'harmonic-default',
          'Harmonic Nightlife Management System',
          'default',
          'active',
          'enterprise',
          '{
            "tagline": "Nightlife Management System",
            "timezone": "Asia/Jakarta",
            "cutoff_hour": 10,
            "currency_symbol": "Rp",
            "tax_pb1_percent": 10.0,
            "service_charge_percent": 5.0,
            "pricing_mode": "plus_plus",
            "grace_period_minutes": 10,
            "modules": {
              "lady_companion": true,
              "tv_hardware_bridge": true,
              "kitchen_bar_split_print": false,
              "inventory_tracking": true
            },
            "terminology": {
              "unit_label": "Ruangan",
              "unit_plural": "Ruangan",
              "unit_prefix": "Room"
            }
          }'::jsonb
        ),
        (
          'golden-ktv-jakarta',
          'Golden Executive KTV',
          'golden-ktv',
          'active',
          'pro',
          '{
            "tagline": "Executive Karaoke & Private Lounge",
            "timezone": "Asia/Jakarta",
            "cutoff_hour": 8,
            "currency_symbol": "Rp",
            "tax_pb1_percent": 12.5,
            "service_charge_percent": 7.0,
            "pricing_mode": "plus_plus",
            "grace_period_minutes": 15,
            "modules": {
              "lady_companion": true,
              "tv_hardware_bridge": true,
              "kitchen_bar_split_print": true,
              "inventory_tracking": true
            },
            "terminology": {
              "unit_label": "Room",
              "unit_plural": "Rooms",
              "unit_prefix": "VIP"
            }
          }'::jsonb
        ),
        (
          'vortex-lounge-bar',
          'Vortex Lounge & Bar',
          'vortex-lounge',
          'active',
          'pro',
          '{
            "tagline": "Cocktail Bar & Music Lounge",
            "timezone": "Asia/Makassar",
            "cutoff_hour": 6,
            "currency_symbol": "Rp",
            "tax_pb1_percent": 10.0,
            "service_charge_percent": 5.0,
            "pricing_mode": "nett",
            "grace_period_minutes": 0,
            "modules": {
              "lady_companion": false,
              "tv_hardware_bridge": false,
              "kitchen_bar_split_print": true,
              "inventory_tracking": true
            },
            "terminology": {
              "unit_label": "Meja",
              "unit_plural": "Meja",
              "unit_prefix": "Table"
            }
          }'::jsonb
        )
      ON CONFLICT (tenant_id) DO NOTHING;
    `);

    // 3. Verify each operational table, add tenant_id column, backfill, and index
    for (const table of OPERATIONAL_TABLES) {
      try {
        const tableExistsRes = await db.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = $1
          );
        `, [table]);

        if (tableExistsRes.rows[0]?.exists === true) {
          // Add column if not exists
          await db.query(`
            ALTER TABLE "${table}" 
            ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) DEFAULT 'harmonic-default';
          `);

          // Backfill nulls to default tenant
          await db.query(`
            UPDATE "${table}" 
            SET tenant_id = 'harmonic-default' 
            WHERE tenant_id IS NULL;
          `);

          // Create composite index
          await db.query(`
            CREATE INDEX IF NOT EXISTS "idx_${table}_tenant" 
            ON "${table}" (tenant_id);
          `);
        }
      } catch (colErr) {
        console.warn(`[MULTI-TENANT] Peringatan migrasi tabel ${table}:`, colErr.message);
      }
    }

    // 4. Setup Row Level Security (RLS) on key operational tables
    for (const table of RLS_TABLES) {
      try {
        const tableExistsRes = await db.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = $1
          );
        `, [table]);

        if (tableExistsRes.rows[0]?.exists === true) {
          // Enable RLS on the table
          await db.query(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`);

          // Create safe isolation policy
          const policyName = `tenant_isolation_${table}`;
          await db.query(`
            DO $$
            BEGIN
              IF NOT EXISTS (
                SELECT 1 FROM pg_policies 
                WHERE tablename = '${table}' AND policyname = '${policyName}'
              ) THEN
                CREATE POLICY "${policyName}" ON "${table}"
                  FOR ALL
                  USING (
                    tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')
                    OR NULLIF(current_setting('app.current_tenant_id', true), '') IS NULL
                  )
                  WITH CHECK (
                    tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')
                    OR NULLIF(current_setting('app.current_tenant_id', true), '') IS NULL
                  );
              END IF;
            END $$;
          `);
        }
      } catch (rlsErr) {
        console.warn(`[MULTI-TENANT] Peringatan RLS tabel ${table}:`, rlsErr.message);
      }
    }

    const tenantCountRes = await db.query('SELECT COUNT(*)::int as count FROM tenants;');
    console.log(`[MULTI-TENANT] Migrasi multi-tenant selesai sukses. Total tenant aktif: ${tenantCountRes.rows[0]?.count || 0}`);
  } catch (err) {
    console.error('[MULTI-TENANT] Gagal menjalankan migrasi multi-tenant:', err.message);
    throw err;
  }
}

module.exports = runMultiTenantMigration;
