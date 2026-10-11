const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const apiRoutes = require('./routes/api');
const { startSyncWorker, getSyncStatus } = require('./services/railwaySyncWorker');
const { startOwnerMirrorPushWorker, getOwnerMirrorPushStatus } = require('./services/ownerMirrorPushWorker');
const { startTvSweeperWorker, getTvSweeperStatus, getBridgeHealth } = require('./services/tvBridgeService');
const { getServerTimeFields } = require('./utils/response');

const app = express();
const PORT = process.env.PORT || 3000;
const BIND_HOST = process.env.BIND_HOST || '0.0.0.0';

const allowedOrigins = [
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
  /^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/,
  /^http:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/
];

const normalizeOrigin = (value) => String(value || '').trim().replace(/\/$/, '').toLowerCase();
const configuredAllowedOrigins = new Set([
  'https://karaoke-management-system-production.up.railway.app',
  process.env.APP_PUBLIC_URL,
  process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : '',
  ...String(process.env.CORS_ALLOWED_ORIGINS || '').split(',')
].map(normalizeOrigin).filter(Boolean));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const normalizedOrigin = normalizeOrigin(origin);
    const isAllowed = configuredAllowedOrigins.has(normalizedOrigin)
      || allowedOrigins.some(regex => regex.test(normalizedOrigin));
    if (isAllowed) return callback(null, true);
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.text({ type: ['text/plain', 'application/json'], limit: '50mb' }));

app.use('/', apiRoutes);
app.use('/api', apiRoutes);

const frontendRoot = path.join(__dirname, '../..');
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});
/*
  Konfigurasi bridge TV untuk dashboard kasir.
  SENGAJA KOSONG (sejak 2026-10-02).

  Sebelumnya endpoint ini menyuntikkan ALAMAT dan TOKEN bridge ke halaman kasir. Dua masalahnya:
    1. Alamatnya dari TV_BRIDGE_PUBLIC_URL yang bisa basi (pernah menunjuk 192.168.1.3, alamat PC
       ini di jaringan lama) sehingga jalur browser SELALU gagal dan kartu ruangan menampilkan
       peringatan "TV gagal dimatikan" padahal server sudah mengerjakan bagiannya.
    2. Token ikut terbaca oleh siapa pun yang bisa membuka halaman kasir.

  Kenapa kosong ini tidak menghilangkan fitur apa pun: SEMUA perintah TV sudah dikirim SERVER
  (lihat routes/api.js -> planTvSync -> tvBridgeService yang memakai TV_BRIDGE_URL dari .env),
  dan server yang mengirimnya adalah proses yang sama dengan yang menyajikan halaman ini, jadi
  alamat itu selalu benar. Server juga mengembalikan hasil nyata (mis. "TV ... tidak menjawab")
  lewat balasan aksinya, sehingga pesan di kartu ruangan tetap jujur.
*/
app.get('/tv-bridge-config.js', (req, res) => {
  res.type('application/javascript');
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.send('window.__TV_BRIDGE__ = { url: "", token: "" };');
});

app.use(express.static(frontendRoot, {
  index: 'index.html',
  extensions: ['html']
}));

app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    server: 'Harmonic Karaoke Cloud Server (Node.js)',
    ...getServerTimeFields()
  });
});

app.get('/sync/status', async (req, res) => {
  try {
    const status = await getSyncStatus();
    const bridge = await getBridgeHealth();
    res.json({
      ok: true,
      success: true,
      ...status,
      owner_mirror_push: getOwnerMirrorPushStatus(),
      tv_bridge: {
        ...getTvSweeperStatus(),
        reachable: bridge.ok === true,
        bridge_error: bridge.ok === true ? null : bridge.error || null,
      },
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

async function ensureDatabaseBootstrap() {
  try {
    const db = require('./db');
    const tableCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'room_sessions'
      );
    `);
    const tablesExist = tableCheck.rows[0]?.exists === true;

    if (!tablesExist) {
      console.log('[DB-BOOTSTRAP] Tabel database belum lengkap. Menjalankan DDL schema & restorasi dataset...');
      const initDatabase = require('./db/init');
      await initDatabase();
      const restoreBackup = require('./db/restore-backup');
      await restoreBackup();
      console.log('[DB-BOOTSTRAP] Inisialisasi database dan dataset selesai sukses!');
    } else {
      console.log('[DB-BOOTSTRAP] Tabel database terverifikasi.');
      const trxCheck = await db.query('SELECT COUNT(*)::int as count FROM transactions');
      if ((trxCheck.rows[0]?.count || 0) === 0) {
        console.log('[DB-BOOTSTRAP] Tabel ada tapi transaksi masih kosong. Merestorasi dataset...');
        const restoreBackup = require('./db/restore-backup');
        await restoreBackup();
      }
    }

    await db.query(`
      ALTER TABLE stock_movements ALTER COLUMN reference_type TYPE VARCHAR(50);
      ALTER TABLE stock_movements DROP CONSTRAINT IF EXISTS stock_movements_reference_type_check;
      ALTER TABLE stock_movements ADD CONSTRAINT stock_movements_reference_type_check
      CHECK (reference_type IN ('transaction', 'manual_adjustment', 'stock_audit', 'inventory_audit', 'fnb_order', 'goods_receipt', 'initial_stock_revision'));
    `);
    console.log('[DB] Schema constraint stock_movements_reference_type_check verified.');
  } catch (err) {
    if (err.code !== 'ECONNREFUSED' && !err.message.includes('ECONNREFUSED') && !err.message.includes('DATABASE_OFFLINE')) {
      console.warn('[DB] Notice verifying/bootstrapping database:', err.message);
    }
  }
}

function startServer(port = PORT, bindHost = BIND_HOST) {
  ensureDatabaseBootstrap();
  if (process.env.ENABLE_LOCAL_SYNC_WORKER === '1') {
    startSyncWorker(parseInt(process.env.SYNC_INTERVAL_MS || '30000', 10));
  }
  if (process.env.ENABLE_OWNER_MIRROR_PUSH_WORKER === '1') {
    startOwnerMirrorPushWorker(parseInt(process.env.OWNER_MIRROR_PUSH_INTERVAL_MS || '1800000', 10));
  }
  if (process.env.ENABLE_TV_SWEEPER === '1') {
    startTvSweeperWorker(parseInt(process.env.TV_BRIDGE_SWEEP_INTERVAL_MS || '60000', 10));
  }

  return app.listen(port, bindHost, () => {
    console.log('===========================================================');
    console.log(`HARMONIC KARAOKE CLOUD SERVER LISTENING ON http://${bindHost}:${port}`);
    console.log(`- Web Dashboard: http://localhost:${port}/`);
    console.log(`- API Endpoint: http://localhost:${port}/exec`);
    console.log(`- Observability: http://localhost:${port}/sync/status`);
    console.log('===========================================================');
  });
}

if (require.main === module) {
  startServer();
}

module.exports = app;
module.exports.startServer = startServer;
