# Panduan Layout SVG CYO

Layout CYO dimuat langsung dari file SVG yang dirujuk setiap sub-menu di
`script.js`. Path tidak perlu disalin ke array JavaScript.

## Struktur file SVG

Setiap SVG perlu memiliki:

- `viewBox` pada elemen `<svg>`.
- Grup `<g id="Base">` dengan satu bentuk dasar langsung di dalamnya, misalnya
  `<rect>` atau `<circle>`.
- Grup `<g id="Section">` yang berisi bentuk kompartemen langsung. ID bentuk
  harus berakhiran nomor urut, misalnya `Section_x0020_1`,
  `Section_x0020_2`, dan seterusnya. ID bertingkat seperti
  `Section_x0020_1_0` juga didukung dan diurutkan berdasarkan komponen angkanya.
  Bentuk boleh berupa `<path>`, `<circle>`, `<ellipse>`, atau `<rect>`.
- Opsional: grup `<g id="Locked_x0020_Section">` dengan `<path id="Sambal">`
  untuk area sambal yang tidak dapat dipilih sebagai hidangan.

Jumlah dan nomor kompartemen harus cocok dengan `sections` di konfigurasi.
Jika SVG memiliki bentuk `Sambal`, konfigurasi juga harus mengisi
`sambalSectionId` setelah kompartemen hidangan.

## Menambahkan atau mengganti layout

1. Simpan SVG di folder `Assets/CYO Layout`.
2. Di `script.js`, tambahkan atau ubah entri sub-menu di `CYO_CONFIG`:

   ```js
   {
     id: 'contoh-submenu',
     name: 'Nama Sub-Menu',
     layoutTemplate: 'contoh-layout',
     svgFile: 'Assets/CYO Layout/Nama File.svg',
     sections: [
       { id: 'section-1', label: 'Bagian 1' },
       { id: 'section-2', label: 'Bagian 2' }
     ]
   }
   ```

3. Pastikan `sections` berjumlah sama dan memakai ID urut yang sama dengan
   bentuk pada grup `Section`. Jika ada bentuk Sambal, tambahkan ID terakhir,
   label `Sambal`, dan `sambalSectionId` yang sama.
4. `index.html` sudah menyediakan clip path hingga `section-6`. Jika suatu
   layout membutuhkan lebih dari enam bentuk termasuk area Sambal, tambahkan
   `clip-section-N` yang sesuai pada `<defs>`.

## Layout yang saat ini terpasang

| Menu | Sub-menu | File SVG | Kompartemen hidangan |
|---|---|---|---:|
| Sajian Nyalira | Kotak Ini | `Assets/CYO Layout/Kotak Ini.svg` | 5 + Sambal |
| Sajian Nyalira | Kotak itu | `Assets/CYO Layout/Kotak itu.svg` | 4 |
| Sajian Nyalira | Besekan | `Assets/CYO Layout/Besekan.svg` | 6 |
| Sajian Nyalira | Tumpeng Mini | `Assets/CYO Layout/Tumpeng Mini.svg` | 5 + Sambal |
| Sajian Ngariung | Tempat Gini | `Assets/CYO Layout/Tempat Gini.svg` | 5 + Sambal |
| Sajian Ngariung | Tempat Gitu | `Assets/CYO Layout/Tempat Gitu.svg` | 5 |

Sajian Ngariung menampilkan pilihan hidangan Liwet dan Tumpeng. Biaya
kemasannya menggunakan biaya Liwet yang tercantum di `packaging-costs.json`.
