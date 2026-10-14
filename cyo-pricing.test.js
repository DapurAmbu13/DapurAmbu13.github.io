const test = require('node:test');
const assert = require('node:assert/strict');
const { hitungHargaCyo, KOMISI, PEMBULATAN } = require('./cyo-pricing.js');

const packagingCosts = {
  'Kotak Ini': 4000,
  'Kotak itu': 4000,
  'Tumpeng Mini': 7000,
  Besekan: 7000,
  'Tempat Gini': 5000,
  'Tempat Gitu': 5000
};

function runCase(name, dishes, jenisBox, jumlahPorsi, expected) {
  test(name, () => {
    const result = hitungHargaCyo({ dishes, jenisBox, jumlahPorsi, packagingCosts });
    for (const [key, value] of Object.entries(expected)) {
      assert.equal(result[key], value, `${name}: ${key}`);
    }
    assert.equal(result.hargaPerPorsi, result.totalOperasional + KOMISI);
  });
}

runCase('Case 1: Kotak Ini 10 porsi', [
  { hppPerPortion: 2000 },
  { hppPerPortion: 6000 },
  { hppPerPortion: 1500 },
  { hppPerPortion: 1500 },
  { hppPerPortion: 500 },
  { hppPerPortion: 500 },
  { hppPerPortion: 500 },
  { hppPerPortion: 500 },
  { hppPerPortion: 2000 }
], 'Kotak Ini', 10, {
  hppHidangan: 15000,
  hppKemasan: 4000,
  totalOperasional: 32000,
  hargaHidangan: 28000,
  biayaKemasanLayanan: 6000,
  hargaPerPorsi: 34000,
  subtotalAkhir: 340000
});

runCase('Case 2: Kotak Ini dengan komposisi alternatif', [
  { hppPerPortion: 2000 },
  { hppPerPortion: 6000 },
  { hppPerPortion: 1500 },
  { hppPerPortion: 500 },
  { hppPerPortion: 500 }
], 'Kotak Ini', 10, {
  hppHidangan: 10500,
  hppKemasan: 4000,
  totalOperasional: 24500,
  hargaHidangan: 20500,
  biayaKemasanLayanan: 6000,
  hargaPerPorsi: 26500,
  subtotalAkhir: 265000
});

test('Box Tumpeng Mini, Besekan, dan Ngariung mengikuti format operasi dan pembulatan', () => {
  const boxes = [
    ['Tumpeng Mini', 7000, [{ hppPerPortion: 7000 }, { hppPerPortion: 5000 }, { hppPerPortion: 2500 }]],
    ['Besekan', 7000, [{ hppPerPortion: 9000 }, { hppPerPortion: 1500 }, { hppPerPortion: 1000 }, { hppPerPortion: 1500 }]],
    ['Tempat Gini', 5000, [{ hppPerPortion: 4000 }, { hppPerPortion: 3000 }, { hppPerPortion: 5000 }]]
  ];

  for (const [jenisBox, expectedPackaging, dishes] of boxes) {
    const result = hitungHargaCyo({ dishes, jenisBox, jumlahPorsi: 10, packagingCosts });
    assert.equal(result.hppKemasan, expectedPackaging);
    assert.equal(result.hargaPerPorsi, result.totalOperasional + KOMISI);
    assert.equal(result.subtotalAkhir, result.hargaPerPorsi * 10);
    assert.equal(result.totalOperasional % PEMBULATAN, 0, `${jenisBox} harus dibulatkan ke kelipatan ${PEMBULATAN}`);
  }
});

test('Komposisi sama dengan menu tetap tetap dihitung menggunakan rumus CYO', () => {
  const dishes = [
    { name: 'Nasi Putih', hppPerPortion: 2000 },
    { name: 'Ayam Rica-rica', hppPerPortion: 6000 },
    { name: 'Tempe Bacem', hppPerPortion: 1500 },
    { name: 'Urab', hppPerPortion: 1500 },
    { name: 'Sambal Ambu', hppPerPortion: 500, category: 'Pelengkap > Sambal' },
    { name: 'Lalapan', hppPerPortion: 500, category: 'Pelengkap' },
    { name: 'Kerupuk', hppPerPortion: 500, category: 'Pelengkap' },
    { name: 'Air Minum Kemasan', hppPerPortion: 500, category: 'Pelengkap' },
    { name: 'Pisang', hppPerPortion: 2000, category: 'Pelengkap > Buah' }
  ];
  const result = hitungHargaCyo({
    dishes,
    jenisBox: 'Kotak Ini',
    jumlahPorsi: 10,
    packagingCosts
  });

  assert.equal(result.hppHidangan, 15000);
  assert.equal(result.hppKemasan, 4000);
  assert.equal(result.totalOperasional, 32000);
  assert.equal(result.hargaHidangan, 28000);
  assert.equal(result.hargaPerPorsi, 34000);
  assert.equal(result.subtotalAkhir, 340000);
  assert.equal(result.hargaPerPorsi, result.totalOperasional + KOMISI);
});

test('Harga CYO mengabaikan harga menu tetap dan tetap memakai rumus CYO', () => {
  const result = hitungHargaCyo({
    dishes: [{ name: 'Nasi Putih', hppPerPortion: 2000 }],
    jenisBox: 'Kotak Ini',
    jumlahPorsi: 10,
    packagingCosts,
    fixedMenus: [{
      name: 'Menu Tetap',
      price: 35000,
      boxType: 'Nasi Kotak',
      ingredients: ['Nasi Putih']
    }],
    fixedMenuBoxType: 'Nasi Kotak'
  });

  assert.equal(result.hppKemasan, 4000);
  assert.equal(result.totalOperasional, 10000);
  assert.equal(result.hargaHidangan, 6000);
  assert.equal(result.hargaPerPorsi, result.totalOperasional + KOMISI);
  assert.equal(result.hargaPerPorsi, 12000);
  assert.equal(result.subtotalAkhir, 120000);
});

test('Builder kosong hanya menghitung kemasan dan layanan', () => {
  const result = hitungHargaCyo({
    dishes: [],
    jenisBox: 'Kotak Ini',
    jumlahPorsi: 10,
    packagingCosts
  });

  assert.equal(result.hppHidangan, 0);
  assert.equal(result.hargaHidangan, 0);
  assert.equal(result.hppKemasan, 4000);
  assert.equal(result.biayaKemasanLayanan, 6000);
  assert.equal(result.totalOperasional, 4000);
  assert.equal(result.hargaPerPorsi, 6000);
  assert.equal(result.subtotalAkhir, 60000);
});

test('Margin 40% diterapkan ke total HPP hidangan dan kemasan', () => {
  const result = hitungHargaCyo({
    dishes: [{ hppPerPortion: 6000 }],
    jenisBox: 'Kotak Ini',
    jumlahPorsi: 10,
    packagingCosts
  });

  assert.equal(result.hppHidangan + result.hppKemasan, 10000);
  assert.equal(result.totalOperasional, 17000);
  assert.equal(result.hargaPerPorsi, 19000);
  assert.equal(result.marginPercent, 40);
});
