#!/usr/bin/env python3
"""
HARMONIC NIGHTLIFE SYSTEM
Script Generator PDF: Panduan Instalasi & Setup Awal Venue
Zero em dashes rule strictly enforced.
"""

import os
import shutil
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to dynamically compute and draw running headers and
    total page counts in footers across all pages except the cover page.
    """
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#64748b"))

        # Skip running header and footer on cover page (page 1)
        if self._pageNumber > 1:
            # Running header
            self.drawString(40, 808, "HARMONIC NIGHTLIFE SYSTEM")
            self.setFont("Helvetica", 8)
            self.drawRightString(555, 808, "PANDUAN RESMI INSTALASI & SETUP AWAL")
            self.setStrokeColor(colors.HexColor("#cbd5e1"))
            self.setLineWidth(0.6)
            self.line(40, 802, 555, 802)

            # Running footer
            self.line(40, 42, 555, 42)
            self.drawString(40, 30, "Harmonic Operating Platform - Panduan Implementasi Mandiri")
            page_text = f"Halaman {self._pageNumber} dari {page_count}"
            self.drawRightString(555, 30, page_text)

        self.restoreState()


def build_pdf(output_filename):
    # Setup document
    doc = SimpleDocTemplate(
        output_filename,
        pagesize=A4,
        leftMargin=40,
        rightMargin=40,
        topMargin=46,
        bottomMargin=48
    )

    # Styles
    base_styles = getSampleStyleSheet()

    # Custom styles
    c_primary = colors.HexColor("#0f172a")     # Deep slate
    c_gold = colors.HexColor("#b45309")        # Executive dark amber/gold
    c_gold_light = colors.HexColor("#fef3c7")  # Amber badge background
    c_slate_dark = colors.HexColor("#1e293b")  # Dark slate for table headers
    c_body = colors.HexColor("#334155")        # Charcoal text
    c_border = colors.HexColor("#e2e8f0")      # Clean gray border

    title_cover_style = ParagraphStyle(
        'CoverTitle',
        parent=base_styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=30,
        textColor=c_primary,
        alignment=0, # Left
        spaceAfter=10
    )

    subtitle_cover_style = ParagraphStyle(
        'CoverSubtitle',
        parent=base_styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=17,
        textColor=c_body,
        alignment=0,
        spaceAfter=18
    )

    badge_style = ParagraphStyle(
        'CoverBadge',
        parent=base_styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=c_gold,
        textTransform='uppercase'
    )

    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=base_styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=20,
        textColor=c_primary,
        spaceBefore=14,
        spaceAfter=8,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=base_styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11.5,
        leading=16,
        textColor=c_gold,
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body_Custom',
        parent=base_styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=14.5,
        textColor=c_body,
        spaceAfter=6
    )

    body_bold = ParagraphStyle(
        'Body_Bold',
        parent=body_style,
        fontName='Helvetica-Bold'
    )

    bullet_style = ParagraphStyle(
        'Bullet_Custom',
        parent=body_style,
        leftIndent=15,
        firstLineIndent=-10,
        spaceAfter=4
    )

    callout_text = ParagraphStyle(
        'Callout_Text',
        parent=base_styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13.5,
        textColor=colors.HexColor("#78350f")
    )

    callout_bold = ParagraphStyle(
        'Callout_Bold',
        parent=callout_text,
        fontName='Helvetica-Bold'
    )

    table_cell = ParagraphStyle(
        'TableCell',
        parent=base_styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=c_body
    )

    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=table_cell,
        fontName='Helvetica-Bold',
        textColor=c_primary
    )

    table_header = ParagraphStyle(
        'TableHeader',
        parent=base_styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=colors.white
    )

    story = []

    # =========================================================================
    # HALAMAN 1: COVER & EXECUTIVE OVERVIEW
    # =========================================================================
    story.append(Spacer(1, 15))

    # Top Brand Header Table
    brand_badge_data = [
        [
            Paragraph("<b>HARMONIC NIGHTLIFE SYSTEM</b> | DOKUMEN RESMI", badge_style),
            Paragraph("VERSI 2.4", ParagraphStyle('CoverVer', parent=badge_style, alignment=2, textColor=colors.HexColor("#64748b")))
        ]
    ]
    t_brand = Table(brand_badge_data, colWidths=[380, 135])
    t_brand.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(t_brand)

    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=2, color=c_gold, spaceBefore=4, spaceAfter=20))

    # Title & Subtitle
    story.append(Paragraph("Panduan Lengkap Instalasi &amp; Setup Awal", title_cover_style))
    story.append(Paragraph(
        "Standar Operasional Prosedur (SOP) Onboarding Mandiri dan Inisialisasi Sistem untuk Karaoke Eksekutif, Nightclub, Lounge, dan Bar.",
        subtitle_cover_style
    ))

    # Meta Information Box
    meta_data = [
        [Paragraph("Penerbit Dokumen", table_cell_bold), Paragraph("Harmonic Nightlife System Engineering", table_cell)],
        [Paragraph("Tujuan Penggunaan", table_cell_bold), Paragraph("Panduan Setup Venue Perdana &amp; Simulasi Transaksi Kasir", table_cell)],
        [Paragraph("Format Alamat URL", table_cell_bold), Paragraph("<b>https://[nama-venue].harmonicpos.com</b>", table_cell)],
        [Paragraph("Arsitektur Sistem", table_cell_bold), Paragraph("Multi-Tenant Cloud Terisolasi dengan Dukungan Offline-First", table_cell)],
        [Paragraph("Kepatuhan Regulasi", table_cell_bold), Paragraph("Pajak Hiburan / PB1 10%, Service Charge, Audit Trail Shift Malam", table_cell)],
    ]
    t_meta = Table(meta_data, colWidths=[150, 365])
    t_meta.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ('GRID', (0, 0), (-1, -1), 0.5, c_border),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]))
    story.append(t_meta)
    story.append(Spacer(1, 16))

    # Executive Overview Callout Box
    overview_html = (
        "<b>Ringkasan Eksekutif Sistem:</b><br/>"
        "Harmonic dirancang khusus untuk memecahkan kompleksitas bisnis hiburan malam. Setiap tempat "
        "yang mendaftar akan mendapatkan ruang kerja dan basis data mandiri secara otomatis, "
        "lengkap dengan pengelolaan billing waktu ruangan, penagihan tarif pemandu lagu (LC) per jam, "
        "integrasi kontrol Smart TV di dalam room, serta penutupan buku kas malam dengan mekanisme Cut-Off "
        "agar pembukuan tidak terpecah di tengah malam."
    )
    callout_box = Table(
        [[Paragraph(overview_html, callout_text)]],
        colWidths=[515]
    )
    callout_box.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), c_gold_light),
        ('BOX', (0, 0), (-1, -1), 1, c_gold),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
    ]))
    story.append(callout_box)
    story.append(Spacer(1, 18))

    # Ringkasan Tahapan Utama
    story.append(Paragraph("<b>4 Fase Utama Implementasi Venue:</b>", body_bold))
    story.append(Spacer(1, 6))

    steps_overview_data = [
        [
            Paragraph("<b>Fase 1: Registrasi Mandiri</b><br/>Mengisi profil venue, menentukan subdomain khusus, dan menetapkan jam operasional.", table_cell),
            Paragraph("<b>Fase 2: Konfigurasi Billing</b><br/>Menetapkan PB1 10%, service charge, serta modul pemandu lagu &amp; split printer.", table_cell)
        ],
        [
            Paragraph("<b>Fase 3: Pembuatan Kredensial</b><br/>Menentukan PIN Master Owner 6 digit untuk proteksi akses manajerial dan void kasir.", table_cell),
            Paragraph("<b>Fase 4: Simulasi Hari Pertama</b><br/>Uji coba check-in ruangan, input order F&amp;B, cetak struk kasir, dan penutupan shift.", table_cell)
        ]
    ]
    t_steps = Table(steps_overview_data, colWidths=[252, 253])
    t_steps.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.5, c_border),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]))
    story.append(t_steps)

    story.append(PageBreak())

    # =========================================================================
    # HALAMAN 2: CHECKLIST PERSIAPAN & ARSITEKTUR
    # =========================================================================
    story.append(Paragraph("BAGIAN 1: PERSIAPAN SEBELUM SETUP &amp; CHECKLIST", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=c_border, spaceBefore=2, spaceAfter=12))

    story.append(Paragraph(
        "Sebelum Anda memulai proses pendaftaran venue pada antarmuka Setup Wizard, pastikan Anda telah menyiapkan data dan perangkat operasional berikut agar konfigurasi berjalan lancar dalam hitungan menit.",
        body_style
    ))
    story.append(Spacer(1, 8))

    # Tabel Checklist Kebutuhan Data
    story.append(Paragraph("1.1. Checklist Data Operasional Venue", h2_style))
    checklist_data = [
        [Paragraph("Komponen Data", table_header), Paragraph("Fungsi &amp; Dampak pada Sistem", table_header), Paragraph("Contoh Nilai", table_header)],
        [
            Paragraph("<b>Nama Resmi Venue</b>", table_cell_bold),
            Paragraph("Nama yang tercetak pada header struk kasir dan judul dashboard.", table_cell),
            Paragraph("Vortex Club &amp; KTV", table_cell)
        ],
        [
            Paragraph("<b>Subdomain Khusus</b>", table_cell_bold),
            Paragraph("Alamat web unik untuk akses terminal kasir venue Anda.", table_cell),
            Paragraph("vortex-club-ktv", table_cell)
        ],
        [
            Paragraph("<b>Jam Cut-Off Akuntansi</b>", table_cell_bold),
            Paragraph("Batas pergantian tanggal buku keuangan harian (sangat penting untuk shift malam).", table_cell),
            Paragraph("04:00 Pagi (WIB)", table_cell)
        ],
        [
            Paragraph("<b>Tarif Pajak PB1</b>", table_cell_bold),
            Paragraph("Pajak hiburan daerah yang wajib dipungut pada tagihan tamu.", table_cell),
            Paragraph("10%", table_cell)
        ],
        [
            Paragraph("<b>Service Charge</b>", table_cell_bold),
            Paragraph("Biaya layanan operasional untuk pembagian komisi karyawan.", table_cell),
            Paragraph("5% (atau 0% jika ditiadakan)", table_cell)
        ],
        [
            Paragraph("<b>PIN Master Owner</b>", table_cell_bold),
            Paragraph("Kredensial keamanan tertinggi untuk otorisasi pembatalan nota, diskon, dan audit kas.", table_cell),
            Paragraph("6 Digit Angka Rahasia", table_cell)
        ]
    ]
    t_chk = Table(checklist_data, colWidths=[130, 245, 140])
    t_chk.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_slate_dark),
        ('GRID', (0, 0), (-1, -1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(t_chk)
    story.append(Spacer(1, 14))

    # Kebutuhan Hardware
    story.append(Paragraph("1.2. Spesifikasi Hardware &amp; Jaringan Kasir", h2_style))
    story.append(Paragraph("Harmonic berbasis web modern yang sangat ringan dan tidak membutuhkan server fisik yang mahal di lokasi:", body_style))

    hw_items = [
        "<b>Komputer Kasir / Tablet:</b> PC Windows, laptop, atau tablet Android/iPad dengan browser Google Chrome atau Microsoft Edge versi terbaru.",
        "<b>Thermal Receipt Printer:</b> Printer struk kasir ukuran 58mm atau 80mm dengan koneksi USB atau LAN/Wi-Fi (ESC/POS compatible).",
        "<b>Koneksi Internet:</b> Koneksi Wi-Fi atau kabel LAN minimal 5 Mbps. Sistem memiliki penampung memori lokal bila internet mengalami gangguan sementara.",
        "<b>Printer Dapur &amp; Bar (Opsional):</b> Printer terpisah di area bar dan dapur jika ingin mengaktifkan fitur cetak tiket otomatis pesanan."
    ]
    for item in hw_items:
        story.append(Paragraph(f"&bull; {item}", bullet_style))

    story.append(Spacer(1, 14))

    # Catatan Penting Mengenai Isolasi Data
    isolation_html = (
        "<b>Keamanan &amp; Kemandirian Data Anda:</b><br/>"
        "Setiap venue yang didaftarkan terhubung ke basis data terisolasi. Kasir dan data penjualan venue Anda "
        "tidak akan pernah tercampur dengan tempat lain. Anda dapat mengakses sistem melalui URL spesifik Anda "
        "seperti <i>https://vortex-club-ktv.harmonicpos.com</i> atau melalui parameter tenant."
    )
    t_iso = Table([[Paragraph(isolation_html, callout_text)]], colWidths=[515])
    t_iso.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f1f5f9")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#94a3b8")),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]))
    story.append(t_iso)

    story.append(PageBreak())

    # =========================================================================
    # HALAMAN 3: TATA CARA SETUP WIZARD (LANGKAH 1 - 3)
    # =========================================================================
    story.append(Paragraph("BAGIAN 2: PANDUAN PENGISIAN SETUP WIZARD (LANGKAH 1 - 3)", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=c_border, spaceBefore=2, spaceAfter=12))

    story.append(Paragraph(
        "Untuk memulai registrasi, buka halaman registrasi di browser Anda melalui tautan <b>Setup Wizard</b>. Anda akan dipandu melalui 6 langkah formulir yang intuitif:",
        body_style
    ))
    story.append(Spacer(1, 6))

    # Langkah 1
    story.append(Paragraph("Langkah 1: Identitas &amp; Alamat Web Venue", h2_style))
    story.append(Paragraph(
        "Pada langkah pertama, Anda menentukan identitas bisnis dan alamat akses sistem venue Anda:",
        body_style
    ))
    l1_points = [
        "<b>Nama Tempat / Brand Venue:</b> Masukkan nama komersial tempat karaoke atau lounge Anda. Contoh: <i>Vortex Club &amp; KTV</i>.",
        "<b>Subdomain Web Venue:</b> Ketikkan nama alias tanpa spasi. Sistem akan melakukan validasi langsung dan mengalokasikan alamat <i>vortex-club-ktv.harmonicpos.com</i>.",
        "<b>Tagline / Slogan Venue:</b> Slogan singkat tempat hiburan Anda yang akan tercetak di struk (misal: <i>Executive Karaoke &amp; Lounge</i>).",
        "<b>Zona Waktu:</b> Pilih WIB (Asia/Jakarta), WITA (Asia/Makassar), atau WIT (Asia/Jayapura) agar perhitungan durasi billing tepat."
    ]
    for p in l1_points:
        story.append(Paragraph(f"&bull; {p}", bullet_style))

    story.append(Spacer(1, 10))

    # Langkah 2
    story.append(Paragraph("Langkah 2: Konfigurasi Shift &amp; Jam Operasional", h2_style))
    story.append(Paragraph(
        "Pengaturan waktu pada industri hiburan malam memiliki karakteristik khusus yang berbeda dari toko ritel biasa:",
        body_style
    ))
    l2_points = [
        "<b>Jam Buka &amp; Tutup Kasir:</b> Tentukan jam aktif kasir harian (contoh: buka pukul 14:00 siang dan tutup pukul 03:00 subuh).",
        "<b>Jam Cut-Off Akuntansi:</b> Sangat krusial! Menentukan kapan buku kas harian ditutup. Jika diatur pukul <b>04:00 Pagi</b>, maka seluruh transaksi tamu yang masuk antara pukul 00:00 hingga 03:59 subuh tetap dihitung sebagai omzet malam tersebut.",
        "<b>Jumlah Shift:</b> Tentukan apakah tempat Anda menggunakan sistem 2 shift (Shift Siang &amp; Shift Malam) atau 3 shift.",
        "<b>Grace Period Check-Out:</b> Toleransi kelebihan pemakaian ruangan (misal 10 menit). Tamu yang melebihi waktu 5 menit tidak langsung ditagih 1 jam tambahan."
    ]
    for p in l2_points:
        story.append(Paragraph(f"&bull; {p}", bullet_style))

    story.append(Spacer(1, 10))

    # Langkah 3
    story.append(Paragraph("Langkah 3: Pajak Daerah, Service Charge &amp; Billing", h2_style))
    story.append(Paragraph(
        "Harmonic menyediakan fleksibilitas perhitungan pajak daerah dan biaya layanan sesuai ketentuan pemerintah kota setempat:",
        body_style
    ))

    tax_box_data = [
        [Paragraph("Pilihan Billing", table_header), Paragraph("Penjelasan Mekanisme", table_header), Paragraph("Kesesuaian Penggunaan", table_header)],
        [
            Paragraph("<b>Skema Plus-Plus (+ +)</b>", table_cell_bold),
            Paragraph("Harga room dan F&amp;B yang diinput di menu adalah harga dasar belum termasuk pajak. Sistem menambahkan otomatis PB1 10% dan Service 5% pada total bill.", table_cell),
            Paragraph("Standar umum karaoke eksekutif dan lounge berkelas.", table_cell)
        ],
        [
            Paragraph("<b>Skema Nett (All-In)</b>", table_cell_bold),
            Paragraph("Harga yang tertera di menu sudah mencakup pajak dan service. Sistem secara otomatis menghitung proporsi DPP, PB1, dan Service di laporan akuntansi.", table_cell),
            Paragraph("Cocok untuk pub, bar kasual, atau program promo all-in.", table_cell)
        ],
        [
            Paragraph("<b>Pembulatan Kasir</b>", table_cell_bold),
            Paragraph("Membulatkan total bill tunai ke ratusan rupiah terdekat (contoh: Rp 124.620 menjadi Rp 124.700) untuk mempermudah uang kembalian kasir fisik.", table_cell),
            Paragraph("Mencegah selisih kas fisik akibat ketiadaan uang receh.", table_cell)
        ]
    ]
    t_tax = Table(tax_box_data, colWidths=[120, 255, 140])
    t_tax.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_slate_dark),
        ('GRID', (0, 0), (-1, -1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(t_tax)

    story.append(PageBreak())

    # =========================================================================
    # HALAMAN 4: TATA CARA SETUP WIZARD (LANGKAH 4 - 6)
    # =========================================================================
    story.append(Paragraph("BAGIAN 3: PANDUAN PENGISIAN SETUP WIZARD (LANGKAH 4 - 6)", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=c_border, spaceBefore=2, spaceAfter=12))

    # Langkah 4
    story.append(Paragraph("Langkah 4: Fitur &amp; Modul Khusus Nightlife", h2_style))
    story.append(Paragraph(
        "Harmonic dilengkapi fitur-fitur modular yang dapat diaktifkan atau dinonaktifkan sesuai model bisnis tempat Anda:",
        body_style
    ))

    mod_data = [
        [Paragraph("Modul Sistem", table_header), Paragraph("Fungsi &amp; Keunggulan", table_header), Paragraph("Rekomendasi", table_header)],
        [
            Paragraph("<b>Modul LC (Pemandu Lagu)</b>", table_cell_bold),
            Paragraph("Menghitung otomatis durasi pendampingan pemandu lagu per jam, voucher komisi, serta tips langsung ke dalam billing tagihan tamu.", table_cell),
            Paragraph("Aktifkan untuk Executive Karaoke.", table_cell)
        ],
        [
            Paragraph("<b>Split Printer Dapur &amp; Bar</b>", table_cell_bold),
            Paragraph("Memecah tiket pesanan otomatis: makanan diteruskan ke printer kitchen, minuman botol/cocktail diteruskan ke printer bar counter.", table_cell),
            Paragraph("Aktifkan jika area bar dan dapur terpisah.", table_cell)
        ],
        [
            Paragraph("<b>Integrasi Smart TV Bridge</b>", table_cell_bold),
            Paragraph("Menghubungkan aplikasi kasir dengan layar Smart TV di tiap ruangan karaoke untuk menampilkan hitung mundur waktu dan pesan otomatis.", table_cell),
            Paragraph("Opsional untuk efisiensi ruang tamu.", table_cell)
        ],
        [
            Paragraph("<b>Pilihan Terminologi</b>", table_cell_bold),
            Paragraph("Menyesuaikan sebutan unit operasional pada antarmuka: Ruangan (Room), Meja (Table), atau VIP Booth.", table_cell),
            Paragraph("Pilih sesuai tata ruang venue Anda.", table_cell)
        ]
    ]
    t_mod = Table(mod_data, colWidths=[130, 245, 140])
    t_mod.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_slate_dark),
        ('GRID', (0, 0), (-1, -1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(t_mod)
    story.append(Spacer(1, 12))

    # Langkah 5
    story.append(Paragraph("Langkah 5: Generator Starter Pack Data Awal", h2_style))
    story.append(Paragraph(
        "Untuk menghemat waktu penginputan saat baru mulai, sistem menyediakan generator data awal siap pakai:",
        body_style
    ))
    l5_points = [
        "<b>Inisialisasi Data Demo Siap Pakai (Sangat Direkomendasikan):</b> Sistem langsung membuatkan 12 unit kamar (Small, Medium, Large, VIP, VVIP) dengan tarif standar industri, kategori F&amp;B lengkap (Snack, Makanan Berat, Softdrink, Beer, Spirits, Cocktails), dan tarif paket LC.",
        "<b>Mulai dengan Data Kosong:</b> Jika venue Anda memiliki struktur kamar dan menu yang sangat spesifik, Anda dapat memilih mulai dari awal dan menginput master data melalui menu manajemen inventori setelah login."
    ]
    for p in l5_points:
        story.append(Paragraph(f"&bull; {p}", bullet_style))

    story.append(Spacer(1, 10))

    # Langkah 6
    story.append(Paragraph("Langkah 6: Akun Keamanan Owner &amp; Peluncuran", h2_style))
    story.append(Paragraph(
        "Langkah terakhir adalah membuat akun pemilik venue yang memegang hak kuasa penuh atas sistem:",
        body_style
    ))
    l6_points = [
        "<b>Nama Pemilik / General Manager:</b> Nama penanggung jawab operasional venue.",
        "<b>PIN Master Owner:</b> Masukkan PIN numerik (minimal 4 digit, disarankan 6 digit angka). PIN ini adalah kunci otorisasi penting untuk void nota, persetujuan diskon, dan penutupan shift kasir.",
        "<b>Verifikasi Ringkasan:</b> Periksa kembali nama tempat, alamat subdomain, dan skema pajak sebelum menekan tombol inisialisasi.",
        "<b>Peluncuran Venue:</b> Klik tombol <b>Inisialisasi &amp; Luncurkan Venue</b>. Dalam waktu 1-2 detik, database mandiri Anda aktif dan jendela modal akan memberikan tautan langsung ke terminal kasir."
    ]
    for p in l6_points:
        story.append(Paragraph(f"&bull; {p}", bullet_style))

    story.append(PageBreak())

    # =========================================================================
    # HALAMAN 5: RUNBOOK OPERASIONAL PERDANA (SIMULASI KASIR)
    # =========================================================================
    story.append(Paragraph("BAGIAN 4: RUNBOOK SIMULASI TRANSAKSI HARI PERTAMA", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=c_border, spaceBefore=2, spaceAfter=12))

    story.append(Paragraph(
        "Setelah venue Anda selesai diinisialisasi, ikuti simulasi operasional berikut untuk memastikan seluruh tim kasir Anda siap melayani tamu:",
        body_style
    ))
    story.append(Spacer(1, 6))

    # Alur 5 Tahap Operasional Kasir
    runbook_steps = [
        [
            Paragraph("Tahap", table_header),
            Paragraph("Aktivitas Kasir", table_header),
            Paragraph("Tindakan pada Sistem Harmonic", table_header)
        ],
        [
            Paragraph("<b>1. Login Kasir &amp; Buka Shift</b>", table_cell_bold),
            Paragraph("Memulai shift operasional dan mengunci modal awal laci kasir.", table_cell),
            Paragraph("Buka web venue Anda, pilih nama kasir atau masukkan PIN, masukkan nominal Modal Kas Awal (misal Rp 500.000), lalu klik <b>Mulai Shift</b>.", table_cell)
        ],
        [
            Paragraph("<b>2. Check-In Tamu / Buka Billing Room</b>", table_cell_bold),
            Paragraph("Tamu datang dan memilih ruangan karaoke atau meja lounge.", table_cell),
            Paragraph("Pilih kartu kamar yang berstatus <i>Tersedia (Hijau)</i>, tentukan durasi pemesanan (misal 2 Jam) atau mode Open Bill, lalu klik <b>Check-In Ruangan</b>. Timer otomatis berjalan.", table_cell)
        ],
        [
            Paragraph("<b>3. Input Pesanan F&amp;B dan LC</b>", table_cell_bold),
            Paragraph("Tamu memesan makanan, minuman, dan meminta didampingi pemandu lagu.", table_cell),
            Paragraph("Klik kamar yang sedang aktif, buka tab <b>Pesanan F&amp;B</b>, pilih menu yang dipesan, lalu klik <b>Kirim ke Dapur/Bar</b>. Di tab LC, pilih pemandu lagu yang bertugas.", table_cell)
        ],
        [
            Paragraph("<b>4. Pembayaran &amp; Cetak Billing</b>", table_cell_bold),
            Paragraph("Tamu menyelesaikan kunjungan dan meminta nota tagihan (Bill).", table_cell),
            Paragraph("Klik <b>Check-Out &amp; Bayar</b>. Sistem menghitung sewa room, pesanan F&amp;B, PB1 10%, dan service. Pilih metode pembayaran (Tunai/QRIS/Debit) lalu cetak struk resmi.", table_cell)
        ],
        [
            Paragraph("<b>5. Penutupan Shift (End Shift)</b>", table_cell_bold),
            Paragraph("Shift berakhir, kasir menghitung uang fisik dan mencetak laporan Z-Report.", table_cell),
            Paragraph("Buka menu kasir, pilih <b>Tutup Shift</b>, masukkan nominal uang fisik yang ada di laci kasir. Sistem menampilkan rekonsiliasi dan mencetak ringkasan omzet shift.", table_cell)
        ]
    ]
    t_rb = Table(runbook_steps, colWidths=[120, 165, 230])
    t_rb.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_slate_dark),
        ('GRID', (0, 0), (-1, -1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(t_rb)
    story.append(Spacer(1, 14))

    # Tips Efisiensi Operasional
    story.append(Paragraph("4.1. Praktik Terbaik (Best Practices) untuk Kasir &amp; Supervisor", h2_style))
    tips = [
        "<b>Periksa Status Kamar secara Visual:</b> Manfaatkan indikator warna pada dashboard visual (Hijau = Tersedia, Merah = Sedang Digunakan, Kuning = Mendekati Habis Waktu, Abu-Abu = Perlu Dibersihkan).",
        "<b>Peringatan 10 Menit Sebelum Waktu Habis:</b> Sistem akan memunculkan alarm audio-visual lembut saat waktu pemakaian kamar tersisa 10 menit. Kasir dapat menghubungi tamu untuk menanyakan perpanjangan durasi.",
        "<b>Otorisasi Void Terkunci:</b> Setiap pembatalan pesanan atau diskon khusus hanya dapat disetujui jika supervisor/owner memasukkan PIN Master, mencegah kebocoran omzet kasir."
    ]
    for tip in tips:
        story.append(Paragraph(f"&bull; {tip}", bullet_style))

    story.append(PageBreak())

    # =========================================================================
    # HALAMAN 6: FAQ, TROUBLESHOOTING & DUKUNGAN TEKNIS
    # =========================================================================
    story.append(Paragraph("BAGIAN 5: TANYA JAWAB &amp; DUKUNGAN TEKNIS", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=c_border, spaceBefore=2, spaceAfter=12))

    story.append(Paragraph(
        "Berikut jawaban atas pertanyaan umum serta solusi kendala teknis yang mungkin dihadapi saat operasional sehari-hari:",
        body_style
    ))
    story.append(Spacer(1, 6))

    faqs = [
        (
            "Q: Bagaimana jika koneksi internet di tempat karaoke kami tiba-tiba terputus?",
            "A: Harmonic didesain dengan ketahanan data lokal. Transaksi billing yang sedang berjalan tetap aman di dalam browser kasir. Begitu koneksi internet tersambung kembali, sistem secara otomatis melakukan sinkronisasi tanpa kehilangan data satu detik pun."
        ),
        (
            "Q: Bagaimana jika kami lupa PIN Master Owner yang dibuat saat pendaftaran?",
            "A: PIN Master dapat diatur ulang melalui konsol basis data cloud kami atau dengan menghubungi tim dukungan teknis resmi Harmonic dengan melampirkan bukti kepemilikan venue yang sah."
        ),
        (
            "Q: Apakah logo tempat kami dan skema tarif bisa diubah setelah pendaftaran selesai?",
            "A: Sangat bisa. Seluruh konfigurasi, termasuk logo venue, warna tema, daftar menu F&amp;B, tarif kamar, dan persentase pajak dapat disesuaikan sewaktu-waktu melalui menu Pengaturan Kasir."
        ),
        (
            "Q: Apakah sistem mendukung multi-kasir yang bekerja bersamaan?",
            "A: Ya. Sistem mendukung beberapa terminal kasir sekaligus secara simultan (misal kasir lantai 1, kasir lantai 2, dan kasir bar) yang tersambung ke database terpusat yang sama."
        )
    ]

    for q, a in faqs:
        q_p = Paragraph(f"<b>{q}</b>", table_cell_bold)
        a_p = Paragraph(a, body_style)
        t_faq = Table([[q_p], [a_p]], colWidths=[515])
        t_faq.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
            ('BOX', (0, 0), (-1, -1), 0.5, c_border),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ]))
        story.append(t_faq)
        story.append(Spacer(1, 8))

    story.append(Spacer(1, 10))

    # Kotak Bantuan Dukungan Resmi
    support_html = (
        "<b>Pusat Dukungan Teknis &amp; Layanan Pelanggan:</b><br/>"
        "Portal Bantuan Teknis: <b>https://harmonicpos.com/support</b><br/>"
        "Layanan WhatsApp Darurat 24 Jam: <b>+62 812-3456-7890</b><br/>"
        "Email Bantuan Resmi: <b>support@harmonicpos.com</b><br/>"
        "Jam Operasional Tim Dukungan: Standby 24/7 termasuk hari libur nasional &amp; akhir pekan."
    )
    t_sup = Table([[Paragraph(support_html, callout_text)]], colWidths=[515])
    t_sup.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), c_gold_light),
        ('BOX', (0, 0), (-1, -1), 1, c_gold),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
    ]))
    story.append(t_sup)

    # Build PDF using NumberedCanvas
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF generated successfully: {output_filename}")


if __name__ == "__main__":
    target_path = "f:/HARMONIC-SAAS/Panduan_Instalasi_Awal_Harmonic.pdf"
    build_pdf(target_path)

    # Copy to artifact folder
    artifact_dir = "C:/Users/Hp/.gemini/antigravity-ide/brain/fba0999f-a095-4bb3-bf48-56e2d92c5ad0"
    if os.path.exists(artifact_dir):
        artifact_target = os.path.join(artifact_dir, "Panduan_Instalasi_Awal_Harmonic.pdf")
        shutil.copyfile(target_path, artifact_target)
        print(f"Artifact copied to: {artifact_target}")
