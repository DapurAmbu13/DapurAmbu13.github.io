# Dapur Ambu 13 | Katering Rumahan Bandung

Website resmi **Dapur Ambu 13**, katering rumahan di Padalarang, Bandung Barat. Pelanggan bisa memilih menu nasi box, tumpeng, dan liwet, meracik menu sendiri, lalu mengirim pesanan langsung lewat WhatsApp.

**Website:** https://dapurambu13.github.io/

## Fitur

- **Sajian Nyalira** (satu box per orang): Ambu Basic Box, Signature Box, Executive Box, Besekan Ambu, dan Special Box (vegan, vegetarian, nasi bakar, tumpeng mini).
- **Sajian Ngariung** (hidangan bersama, minimal 10 orang): Tumpeng dan Liwet.
- **Terserah Kamu Aja**: pelanggan meracik sendiri isi box (nasi, lauk, sayur, sambal, buah, pelengkap) dengan harga yang dihitung langsung.
- Pencarian menu berdasarkan nama atau lauk.
- Keranjang pesanan dan pengiriman pesanan terformat lewat WhatsApp, tanpa perlu akun.

## Ketentuan Pemesanan

| Ketentuan | Keterangan |
| --- | --- |
| Minimal pesanan | 10 porsi |
| Waktu pemesanan | Paling lambat 3 hari sebelum tanggal acara |
| Uang muka (DP) | 50% untuk mengunci tanggal |
| Area antar | Bandung Raya |
| Jam operasional | Senin-Minggu, 06.00-21.00 |

## Teknologi

Website statis berbasis HTML, CSS, dan JavaScript, tanpa framework dan tanpa proses build. Di-hosting dengan GitHub Pages.

## Struktur Proyek

```
.
├── index.html            # halaman utama
├── style.css             # gaya tampilan
├── script.js             # logika halaman (menu, keranjang, pemesanan)
├── cyo-pricing.js        # perhitungan harga fitur Terserah Kamu Aja
├── cyo-pricing.test.js   # pengujian perhitungan harga
├── Assets/               # logo dan gambar
├── Data/                 # data pendukung situs
├── scripts/              # skrip pendukung
├── README.md
└── LICENSE
```

## Menjalankan di Komputer Sendiri

1. Clone repo ini:
   ```bash
   git clone https://github.com/DapurAmbu13/DapurAmbu13.github.io.git
   cd DapurAmbu13.github.io
   ```
2. Jalankan server lokal, pilih salah satu:
   - Di VS Code, install ekstensi **Live Server**, klik kanan `index.html`, lalu pilih **Open with Live Server**.
   - Atau lewat terminal: `python -m http.server 8000`, lalu buka `http://localhost:8000`.

> Gunakan server lokal, bukan membuka `index.html` langsung dari folder, karena data yang dimuat lewat `fetch` tidak berjalan dengan protokol `file://`.

## Deploy

Setiap perubahan yang di-push ke branch `main` akan otomatis dipublikasikan oleh GitHub Pages dalam 1-2 menit.

```bash
git add .
git commit -m "Pesan perubahan"
git push
```

> GitHub Pages membedakan huruf besar dan kecil pada nama file dan folder. `Assets/logo.png` tidak sama dengan `assets/logo.png`.

## Kontak

- WhatsApp: https://wa.me/6281776759615
- Instagram: https://instagram.com/dapurambu_13
- TikTok: https://www.tiktok.com/@dapurambu_13
- Lokasi: Padalarang, Bandung Barat

## Lisensi

Hak cipta dilindungi. Lihat berkas [LICENSE](LICENSE).
