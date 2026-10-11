const fs = require('fs');
const path = require('path');
const db = require('./index');

const BACKUP_TABLES = [
  'settings',
  'employees',
  'inventory',
  'promos',
  'lc_master',
  'petty_cash_ledger',
  'master_data_audit_logs',
  'operational_audit_events',
  'sync_outbox',
  'owner_mirror_snapshots',
  'rooms',
  'tv_devices',
  'tv_displays',
  'tv_control_logs',
  'room_time_logs',
  'room_recovery_logs',
  'menu',
  'package_master',
  'lc_cash_advances',
  'lc_payroll_history',
  'cashier_closings',
  'recipe',
  'package_details',
  'room_sessions',
  'room_session_segments',
  'inventory_audits',
  'cashier_closing_transactions',
  'cashier_closing_fnb_items',
  'cashier_closing_lc_details',
  'inventory_audit_lines',
  'transactions',
  'fnb_orders',
  'lc_work_logs',
  'transaction_lines',
  'transaction_correction_logs',
  'sales_commission_logs',
  'receipt_print_logs',
  'fnb_order_items',
  'stock_movements',
  'lc_sales_bonus_logs',
  'fnb_order_item_components'
];

async function restoreBackup(backupFilePath = null) {
  const fileToLoad = backupFilePath || path.join(__dirname, 'happy_song_backup.json');

  if (!fs.existsSync(fileToLoad)) {
    throw new Error(`File backup tidak ditemukan di: ${fileToLoad}`);
  }

  console.log(`📦 Membaca file backup dari: ${fileToLoad}...`);
  const rawData = fs.readFileSync(fileToLoad, 'utf8');
  const backupJson = JSON.parse(rawData);
  const data = backupJson.data || backupJson;

  if (!data || typeof data !== 'object') {
    throw new Error('Format berkas backup tidak valid: objek `data` tidak ditemukan.');
  }

  console.log(`🚀 Menghubungkan ke database untuk restorasi data...`);
  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Matikan pemeriksaan relasi asing sementara agar urutan impor aman
    try {
      await client.query("SET session_replication_role = 'replica'");
    } catch (e) {
      console.warn('Notice setting replication role:', e.message);
    }

    // 2. Kosongkan tabel tujuan
    console.log('🧹 Mengosongkan tabel lama sebelum impor...');
    const reverseTables = [...BACKUP_TABLES].reverse();
    for (const table of reverseTables) {
      if (data[table]) {
        await client.query(`TRUNCATE TABLE "${table}" CASCADE`);
      }
    }

    // 3. Masukkan baris data tabel demi tabel
    console.log('📥 Mengimpor baris data...');
    let totalRestoredRows = 0;

    for (const table of BACKUP_TABLES) {
      const rows = data[table];
      if (!Array.isArray(rows) || rows.length === 0) continue;

      const rawKeys = Object.keys(rows[0]);
      if (rawKeys.length === 0) continue;

      const colRes = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = $1
      `, [table]);
      const existingCols = new Set(colRes.rows.map(r => r.column_name));

      for (const k of rawKeys) {
        if (!existingCols.has(k)) {
          console.log(`  + Menambahkan kolom missing ${table}.${k}...`);
          try {
            await client.query(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "${k}" TIMESTAMPTZ`);
            existingCols.add(k);
          } catch (e) {
            try {
              await client.query(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "${k}" TEXT`);
              existingCols.add(k);
            } catch (e2) {}
          }
        }
      }

      const keys = rawKeys.filter(k => existingCols.has(k));
      const cols = keys.map(k => `"${k}"`).join(', ');

      // Insert dalam batch agar sangat cepat melalui jaringan cloud
      const BATCH_SIZE = 50;
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        const valuePlaceholders = [];
        const flatValues = [];

        batch.forEach((row, rowIndex) => {
          const placeholders = keys.map((_, colIndex) => `$${rowIndex * keys.length + colIndex + 1}`);
          valuePlaceholders.push(`(${placeholders.join(', ')})`);
          keys.forEach(k => flatValues.push(row[k] !== undefined ? row[k] : null));
        });

        const queryText = `INSERT INTO "${table}" (${cols}) VALUES ${valuePlaceholders.join(', ')}`;
        await client.query(queryText, flatValues);
      }

      totalRestoredRows += rows.length;
      console.log(`  ✓ ${table}: ${rows.length} baris selesai.`);
    }

    // 4. Kembalikan session_replication_role
    try {
      await client.query("SET session_replication_role = 'origin'");
    } catch (e) {}

    // 5. Reset sequence ID
    try {
      await client.query(`
        SELECT setval(pg_get_serial_sequence('sync_outbox', 'sync_id'), COALESCE((SELECT MAX(sync_id) FROM sync_outbox), 1));
        SELECT setval(pg_get_serial_sequence('owner_mirror_snapshots', 'snapshot_id'), COALESCE((SELECT MAX(snapshot_id) FROM owner_mirror_snapshots), 1));
      `);
    } catch (e) {}

    await client.query('COMMIT');
    console.log(`🎉 RESTORASI SELESAI SUKSES! Total ${totalRestoredRows} baris di ${Object.keys(data).length} tabel berhasil dipulihkan.`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Terjadi kesalahan saat merestore backup:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  restoreBackup()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = restoreBackup;
