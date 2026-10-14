const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const csvPath = path.join(projectRoot, 'Data', 'dishes.csv');
const outputDirectory = path.join(projectRoot, 'Data');
const imageDirectory = path.join(projectRoot, 'Assets', 'Placeholder Ingredients');
const knownBoxTypes = new Set([
  'nasi kotak',
  'liwet',
  'tumpeng',
  'semua jenis box',
  'semua sajian ngariung',
  'kotak ini',
  'kotak itu',
  'besekan',
  'tumpeng mini',
  'tempat gini',
  'tempat gitu'
].map((boxType) => normalize(boxType)));
const packagingAliases = {
  semuasajianngariung: ['Tempat Gini', 'Tempat Gitu']
};
const requiredPackagingTypes = [
  'Kotak Ini',
  'Kotak itu',
  'Besekan',
  'Tumpeng Mini',
  'Tempat Gini',
  'Tempat Gitu'
];
const fallbackImage = 'nasi-putih.png';

function normalize(value) {
  return String(value || '')
    .toLocaleLowerCase('id-ID')
    .replace(/[^a-z0-9]/g, '');
}

function parseCsv(source) {
  const rows = [];
  let row = [];
  let value = '';
  let inQuotes = false;
  let line = 1;
  let rowLine = 1;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (inQuotes) {
      if (character === '"' && source[index + 1] === '"') {
        value += '"';
        index += 1;
      } else if (character === '"') {
        inQuotes = false;
      } else {
        value += character;
        if (character === '\n') line += 1;
      }
      continue;
    }

    if (character === '"' && value.length === 0) {
      inQuotes = true;
    } else if (character === ',') {
      row.push(value);
      value = '';
    } else if (character === '\r' || character === '\n') {
      if (character === '\r' && source[index + 1] === '\n') index += 1;
      line += 1;
      row.push(value);
      if (row.some((cell) => cell.trim())) rows.push({ line: rowLine, values: row });
      row = [];
      value = '';
      rowLine = line;
    } else {
      value += character;
    }
  }

  if (inQuotes) throw new Error(`CSV memiliki kutip yang tidak ditutup (baris ${rowLine})`);
  if (value.length || row.length) {
    row.push(value);
    if (row.some((cell) => cell.trim())) rows.push({ line: rowLine, values: row });
  }
  return rows;
}

function parseMoney(value) {
  if (value === undefined || String(value).trim() === '') return null;
  const cleaned = String(value)
    .replace(/rp/gi, '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const amount = Number(cleaned);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

function findColumn(headers, candidates) {
  const candidateKeys = candidates.map(normalize);
  return headers.findIndex((header) => candidateKeys.includes(normalize(header)));
}

function cell(record, column) {
  return column < 0 ? '' : (record.values[column] || '').trim();
}

function reportList(title, entries) {
  console.log(`\n${title} (${entries.length}):`);
  if (!entries.length) {
    console.log('- Tidak ada.');
    return;
  }
  entries.forEach((entry) => console.log(`- ${entry}`));
}

function main() {
  const source = fs.readFileSync(csvPath, 'utf8').replace(/^\uFEFF/, '');
  const rows = parseCsv(source);
  if (rows.length < 2) throw new Error('CSV tidak memiliki baris data.');

  const headers = rows[0].values.map((header) => header.trim());
  const columns = {
    category: findColumn(headers, ['Kategori', 'category']),
    boxTypes: findColumn(headers, ['Jenis Box', 'jenis_box', 'boxTypes']),
    name: findColumn(headers, ['Nama Dish', 'nama', 'name']),
    hpp: findColumn(headers, ['HPP per porsi', 'hpp']),
    image: findColumn(headers, ['gambar', 'image', 'nama file gambar', 'nama file']),
    packagingPrice: findColumn(headers, ['harga kemasan', 'harga kemasan per porsi'])
  };
  const requiredColumns = ['category', 'boxTypes', 'name', 'hpp'];
  const missingColumns = requiredColumns.filter((key) => columns[key] < 0);
  if (missingColumns.length) {
    throw new Error(`Kolom CSV tidak ditemukan: ${missingColumns.join(', ')}`);
  }

  const imageFiles = fs.readdirSync(imageDirectory)
    .filter((fileName) => /\.(png|jpe?g|webp|gif)$/i.test(fileName));
  const imageByName = new Map(imageFiles.map((fileName) => [
    normalize(path.parse(fileName).name),
    fileName
  ]));
  if (!imageByName.has(normalize(path.parse(fallbackImage).name))) {
    throw new Error(`Gambar placeholder umum tidak ditemukan: ${fallbackImage}`);
  }

  const errors = [];
  const missingImages = [];
  const dishes = [];
  const packagingCosts = {};
  const duplicateKeys = new Set();
  rows.slice(1).forEach((record) => {
    const category = cell(record, columns.category);
    const name = cell(record, columns.name);
    const rawBoxTypes = cell(record, columns.boxTypes);
    if (!category && !name && !rawBoxTypes) return;
    if (!category) errors.push(`baris ${record.line}: kategori kosong untuk "${name}"`);

    const boxTypes = rawBoxTypes.split(',').map((type) => type.trim()).filter(Boolean);
    if (!boxTypes.length) errors.push(`baris ${record.line}: jenis box kosong untuk "${name}"`);
    const invalidBoxTypes = boxTypes.filter((type) =>
      !knownBoxTypes.has(normalize(type))
    );
    invalidBoxTypes.forEach((type) => {
      errors.push(`baris ${record.line}: jenis box tidak dikenal "${type}"`);
    });

    if (normalize(category) === 'kemasan') {
      const hpp = parseMoney(cell(record, columns.hpp));
      const packagingPrice = columns.packagingPrice >= 0
        ? parseMoney(cell(record, columns.packagingPrice))
        : hpp;
      if (boxTypes.some((type) => normalize(type) === 'semuajenisbox')) {
        errors.push(`baris ${record.line}: kemasan tidak boleh memakai "Semua Jenis Box"`);
      }
      if (packagingPrice === null) {
        errors.push(`baris ${record.line}: harga kemasan/HPP tidak berupa angka`);
        return;
      }
      const expandedTypes = boxTypes.flatMap((type) =>
        packagingAliases[normalize(type)] || [type]
      );
      expandedTypes.forEach((type) => {
        const canonicalType = requiredPackagingTypes.find(
          (knownType) => normalize(knownType) === normalize(type)
        );
        if (!canonicalType) {
          errors.push(`baris ${record.line}: jenis box kemasan tidak memiliki pemetaan "${type}"`);
          return;
        }
        if (Object.hasOwn(packagingCosts, canonicalType)) {
          errors.push(`baris ${record.line}: kemasan ganda untuk "${canonicalType}"`);
          return;
        }
        packagingCosts[canonicalType] = packagingPrice;
      });
      return;
    }

    if (!name) errors.push(`baris ${record.line}: nama dish kosong`);
    const hpp = parseMoney(cell(record, columns.hpp));
    if (hpp === null) errors.push(`baris ${record.line}: HPP kosong, nol, atau tidak valid untuk "${name}"`);

    boxTypes.forEach((type) => {
      const duplicateKey = `${normalize(category)}|${normalize(type)}|${normalize(name)}`;
      if (duplicateKeys.has(duplicateKey)) {
        errors.push(`baris ${record.line}: dish ganda "${name}" pada kategori/jenis box yang sama`);
      }
      duplicateKeys.add(duplicateKey);
    });

    const requestedImage = cell(record, columns.image);
    const imageName = requestedImage ? path.parse(requestedImage).name : name;
    const exactImage = imageByName.get(normalize(imageName));
    if (!exactImage && name) missingImages.push(name);
    dishes.push({
      kategori: category,
      jenis_box: boxTypes,
      nama: name,
      hpp,
      gambar: `Assets/Placeholder Ingredients/${exactImage || fallbackImage}`
    });
  });

  requiredPackagingTypes.forEach((type) => {
    if (!Object.hasOwn(packagingCosts, type)) {
      errors.push(`baris kemasan untuk "${type}" tidak ditemukan`);
    }
  });

  fs.mkdirSync(outputDirectory, { recursive: true });
  fs.writeFileSync(path.join(outputDirectory, 'dishes.json'), `${JSON.stringify(dishes, null, 2)}\n`);
  fs.writeFileSync(
    path.join(outputDirectory, 'packaging-costs.json'),
    `${JSON.stringify(packagingCosts, null, 2)}\n`
  );

  reportList('Kesalahan validasi', errors);
  reportList('Dish tanpa gambar khusus (menggunakan placeholder umum)', missingImages);
  console.log(`\nBerhasil menulis ${dishes.length} dish dan ${Object.keys(packagingCosts).length} biaya kemasan ke Data/.`);

  if (errors.length) process.exitCode = 1;
}

try {
  main();
} catch (error) {
  console.error(`Gagal mengonversi CSV: ${error.message}`);
  process.exitCode = 1;
}
