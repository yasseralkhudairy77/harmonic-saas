const db = require('./index');

async function seedDemoData() {
  console.log('🌱 Memulai inisialisasi Demo Data untuk Harmonic Karaoke SaaS...');

  try {
    // 1. Settings
    console.log('- Menyiapkan data Settings...');
    const settings = [
      { key: 'outlet_name', value: 'Harmonic KTV & Lounge', description: 'Nama Tempat Karaoke' },
      { key: 'outlet_address', value: 'Jl. Boulevard Raya No. 88, Suite 101', description: 'Alamat Outlet' },
      { key: 'tax_pb1_rate', value: '10', description: 'Persentase PB1 Pajak Daerah (%)' },
      { key: 'service_charge_rate', value: '5', description: 'Persentase Service Charge (%)' },
      { key: 'cutoff_time', value: '10:00', description: 'Jam Cut-off Pergantian Tanggal Operasional' },
      { key: 'rounding_mode', value: 'floor_100', description: 'Aturan Pembulatan Kasir' },
      { key: 'currency_symbol', value: 'Rp', description: 'Mata Uang' }
    ];

    for (const s of settings) {
      await db.query(`
        INSERT INTO settings (key, value, description)
        VALUES ($1, $2, $3)
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
      `, [s.key, s.value, s.description]);
    }

    // 2. Employees (Staf & PIN)
    console.log('- Menyiapkan data Karyawan / Akses PIN...');
    const employees = [
      { id: 'EMP-001', name: 'Owner / Direktur', role: 'owner', pin: '8888', salary_type: 'monthly', base_salary: 10000000 },
      { id: 'EMP-002', name: 'Budi (Manajer)', role: 'manager', pin: '2222', salary_type: 'monthly', base_salary: 6000000 },
      { id: 'EMP-003', name: 'Siti (Kasir 1)', role: 'cashier', pin: '1111', salary_type: 'daily', base_salary: 150000 },
      { id: 'EMP-004', name: 'Rian (Kasir 2)', role: 'cashier', pin: '1234', salary_type: 'daily', base_salary: 150000 }
    ];

    for (const emp of employees) {
      await db.query(`
        INSERT INTO employees (employee_id, employee_name, role, pin, salary_type, base_salary, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, TRUE)
        ON CONFLICT (employee_id) DO UPDATE SET employee_name = EXCLUDED.employee_name, pin = EXCLUDED.pin
      `, [emp.id, emp.name, emp.role, emp.pin, emp.salary_type, emp.base_salary]);
    }

    // 3. Rooms
    console.log('- Menyiapkan data Master Ruangan (Rooms)...');
    const rooms = [
      { id: 'ROOM-VVIP-01', name: 'VVIP Suite 01 (Royal)', rate: 200000 },
      { id: 'ROOM-VIP-02', name: 'VIP Room 02 (Diamond)', rate: 150000 },
      { id: 'ROOM-VIP-03', name: 'VIP Room 03 (Platinum)', rate: 150000 },
      { id: 'ROOM-MED-04', name: 'Medium Room 04', rate: 100000 },
      { id: 'ROOM-MED-05', name: 'Medium Room 05', rate: 100000 },
      { id: 'ROOM-MED-06', name: 'Medium Room 06', rate: 100000 },
      { id: 'ROOM-SML-07', name: 'Small Room 07', rate: 70000 },
      { id: 'ROOM-SML-08', name: 'Small Room 08', rate: 70000 }
    ];

    for (const r of rooms) {
      await db.query(`
        INSERT INTO rooms (room_id, room_name, status, rate_per_hour)
        VALUES ($1, $2, 'available', $3)
        ON CONFLICT (room_id) DO UPDATE SET room_name = EXCLUDED.room_name, rate_per_hour = EXCLUDED.rate_per_hour
      `, [r.id, r.name, r.rate]);
    }

    // 4. Inventory (Bahan Baku & Produk Retail)
    console.log('- Menyiapkan Master Inventory & Stok Awal...');
    const inventory = [
      { id: 'INV-HEINEKEN', name: 'Heineken Pint 330ml', category: 'Beverage', unit: 'Btl', stock: 120, min: 24 },
      { id: 'INV-CORONA', name: 'Corona Extra 330ml', category: 'Beverage', unit: 'Btl', stock: 80, min: 20 },
      { id: 'INV-COLA', name: 'Coca Cola Can', category: 'Beverage', unit: 'Can', stock: 150, min: 30 },
      { id: 'INV-AQUA', name: 'Air Mineral 600ml', category: 'Beverage', unit: 'Btl', stock: 200, min: 50 },
      { id: 'INV-KENTANG', name: 'Kentang Frozen 1kg', category: 'Kitchen Raw', unit: 'Pack', stock: 25, min: 5 },
      { id: 'INV-SAYAP', name: 'Sayap Ayam Marinated 1kg', category: 'Kitchen Raw', unit: 'Pack', stock: 15, min: 5 },
      { id: 'INV-KACANG', name: 'Kacang Bawang Premium', category: 'Snack Raw', unit: 'Pack', stock: 50, min: 10 }
    ];

    for (const inv of inventory) {
      await db.query(`
        INSERT INTO inventory (stock_item_id, stock_item_name, category, unit, stock_qty, min_stock, status)
        VALUES ($1, $2, $3, $4, $5, $6, 'active')
        ON CONFLICT (stock_item_id) DO UPDATE SET stock_item_name = EXCLUDED.stock_item_name, stock_qty = EXCLUDED.stock_qty
      `, [inv.id, inv.name, inv.category, inv.unit, inv.stock, inv.min]);
    }

    // 5. Menu F&B
    console.log('- Menyiapkan Menu Makanan & Minuman...');
    const menus = [
      { id: 'MENU-BEER-01', name: 'Heineken Beer (Cold)', category: 'Beverage', price: 55000, stock_id: 'INV-HEINEKEN' },
      { id: 'MENU-BEER-02', name: 'Corona Extra Lime', category: 'Beverage', price: 75000, stock_id: 'INV-CORONA' },
      { id: 'MENU-SODA-01', name: 'Coca Cola Dingin', category: 'Beverage', price: 25000, stock_id: 'INV-COLA' },
      { id: 'MENU-MINERAL-01', name: 'Aqua Mineral Water', category: 'Beverage', price: 15000, stock_id: 'INV-AQUA' },
      { id: 'MENU-FOOD-01', name: 'Crispy French Fries', category: 'Snack', price: 38000, stock_id: 'INV-KENTANG' },
      { id: 'MENU-FOOD-02', name: 'Spicy Chicken Wings (6 pcs)', category: 'Food', price: 55000, stock_id: 'INV-SAYAP' },
      { id: 'MENU-SNACK-01', name: 'Snack Platter Deluxe', category: 'Snack', price: 75000, stock_id: null },
      { id: 'MENU-TEA-01', name: 'Ice Lemon Tea Fresh', category: 'Beverage', price: 28000, stock_id: null }
    ];

    for (const m of menus) {
      await db.query(`
        INSERT INTO menu (menu_id, menu_name, category, price, status, stock_tracking, stock_item_id)
        VALUES ($1, $2, $3, $4, 'active', $5, $6)
        ON CONFLICT (menu_id) DO UPDATE SET menu_name = EXCLUDED.menu_name, price = EXCLUDED.price
      `, [m.id, m.name, m.category, m.price, m.stock_id ? 'yes' : 'no', m.stock_id]);
    }

    // 6. Promos
    console.log('- Menyiapkan Program Promo & Diskon...');
    const promos = [
      { code: 'HARMONIC10', name: 'Member Harmonic Diskon 10%', type: 'promo', discount_type: 'percentage', val: 10 },
      { code: 'HAPPYHOUR20', name: 'Happy Hour Siang Diskon 20%', type: 'promo', discount_type: 'percentage', val: 20 },
      { code: 'FREEROOM1H', name: 'Gratis Sewa Room 1 Jam', type: 'promo', discount_type: 'percentage', val: 100 },
      { code: 'VOUCHER50K', name: 'Potongan Langsung Rp 50.000', type: 'promo', discount_type: 'fixed', val: 50000 }
    ];

    for (const p of promos) {
      await db.query(`
        INSERT INTO promos (promo_code, promo_name, type, discount_type, discount_value, is_active)
        VALUES ($1, $2, $3, $4, $5, TRUE)
        ON CONFLICT (promo_code) DO UPDATE SET promo_name = EXCLUDED.promo_name, discount_value = EXCLUDED.discount_value
      `, [p.code, p.name, p.type, p.discount_type, p.val]);
    }

    console.log('✅ Inisialisasi Demo Data Harmonic SaaS Selesai Sukses!');
  } catch (err) {
    console.error('❌ Terjadi kesalahan saat inisialisasi demo data:', err);
    throw err;
  }
}

if (require.main === module) {
  seedDemoData()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = seedDemoData;
