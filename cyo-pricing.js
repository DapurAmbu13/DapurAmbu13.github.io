(function (root, factory) {
  const api = factory();

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  root.hitungHargaCyo = api.hitungHargaCyo;
  root.MARGIN_PERCENT_DEFAULT = api.MARGIN_PERCENT_DEFAULT;
  root.KOMISI = api.KOMISI;
  root.PEMBULATAN = api.PEMBULATAN;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const MARGIN_PERCENT_DEFAULT = 40;
  const KOMISI = 2000;
  const PEMBULATAN = 500;

  function normalizeText(value) {
    return String(value ?? '').trim().replace(/\s+/g, ' ');
  }

  function normalizeKey(value) {
    return normalizeText(value).toLocaleLowerCase('id-ID').replace(/[^a-z0-9]/g, '');
  }

  function parseBoxValues(value) {
    if (Array.isArray(value)) {
      return value.map((item) => normalizeText(item)).filter(Boolean);
    }
    if (typeof value === 'string') {
      return value.split(',').map((item) => normalizeText(item)).filter(Boolean);
    }
    return [];
  }

  function toNumber(value, fallback) {
    const amount = Number(value);
    return Number.isFinite(amount) ? amount : fallback;
  }

  function readDishHpp(dish) {
    const candidates = [
      dish?.hppPerPortion,
      dish?.hppPerPorsi,
      dish?.hpp,
      dish?.['HPP per porsi'],
      dish?.['HPP'],
      dish?.['hpp per porsi']
    ];
    for (const candidate of candidates) {
      if (candidate === undefined || candidate === null || candidate === '') continue;
      const numeric = Number(candidate);
      if (Number.isFinite(numeric)) return numeric;
    }
    return 0;
  }

  function resolvePackagingHpp(jenisBox, packagingCosts) {
    const boxValues = parseBoxValues(jenisBox);
    const normalizedCosts = Object.entries(packagingCosts || {}).reduce((map, [key, value]) => {
      const normalizedKey = normalizeKey(key);
      if (normalizedKey) map[normalizedKey] = Number(value);
      return map;
    }, {});

    for (const boxValue of boxValues) {
      const key = normalizeKey(boxValue);
      if (normalizedCosts[key] !== undefined) {
        return Number(normalizedCosts[key]);
      }
    }

    if (boxValues.length === 0) return 0;
    const fallbackKey = normalizeKey(boxValues[0]);
    return normalizedCosts[fallbackKey] ?? 0;
  }

  function resolveMarginPercent(jenisBox, marginPercent) {
    const validMargin = (value) => {
      const numericMargin = toNumber(value, NaN);
      return numericMargin > 0 && numericMargin < 100
        ? numericMargin
        : MARGIN_PERCENT_DEFAULT;
    };
    const boxValues = parseBoxValues(jenisBox);
    const marginMap = (typeof marginPercent === 'object' && marginPercent !== null)
      ? marginPercent
      : null;

    if (marginMap) {
      for (const boxValue of boxValues) {
        const directKey = boxValue;
        const normalizedKey = normalizeKey(boxValue);
        const value = marginMap[directKey] ?? marginMap[normalizedKey] ?? marginMap.default;
        if (value !== undefined && value !== null) {
          return validMargin(value);
        }
      }
      if (marginMap.default !== undefined && marginMap.default !== null) {
        return validMargin(marginMap.default);
      }
    }

    return validMargin(marginPercent ?? MARGIN_PERCENT_DEFAULT);
  }

  function hitungHargaCyo({
    dishes = [],
    jenisBox = '',
    jumlahPorsi = 1,
    marginPercent = MARGIN_PERCENT_DEFAULT,
    packagingCosts = {}
  } = {}) {
    const normalizedJenisBox = normalizeText(jenisBox);
    const hppHidangan = Array.isArray(dishes)
      ? dishes.reduce((total, dish) => total + readDishHpp(dish), 0)
      : 0;
    const hppKemasan = resolvePackagingHpp(normalizedJenisBox, packagingCosts);
    const margin = resolveMarginPercent(normalizedJenisBox, marginPercent);
    const calculatedTotalOperasional = hppHidangan === 0
      ? 0
      : Math.ceil(((hppHidangan + hppKemasan) * 100) / (100 - margin) / PEMBULATAN) * PEMBULATAN;
    const totalOperasional = hppHidangan === 0
      ? hppKemasan
      : calculatedTotalOperasional;
    const hargaHidangan = totalOperasional - hppKemasan;
    const biayaKemasanLayanan = hppKemasan + KOMISI;
    const hargaPerPorsi = totalOperasional + KOMISI;
    const subtotalAkhir = hargaPerPorsi * Number(jumlahPorsi || 0);

    return {
      hppHidangan,
      hppKemasan,
      totalOperasional,
      hargaHidangan,
      biayaKemasanLayanan,
      hargaPerPorsi,
      subtotalAkhir,
      marginPercent: margin,
      jumlahPorsi: Number(jumlahPorsi || 0)
    };
  }

  return {
    hitungHargaCyo,
    MARGIN_PERCENT_DEFAULT,
    KOMISI,
    PEMBULATAN
  };
});
