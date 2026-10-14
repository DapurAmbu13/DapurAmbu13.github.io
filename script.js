/* =========================================================
  dapur ambu — SCRIPT.JS
   Vanilla JS: nav, cart, regular/catering add-to-order,
   CYO bento builder with live pricing, WhatsApp checkout.
   ========================================================= */

(function () {
  'use strict';

  /* ---------- CONFIG ---------- */
  const WHATSAPP_NUMBER = '6281776759615'; // international format, no "+" or leading zeros
  const DELIVERY_TIME_START = '06:00';
  const DELIVERY_TIME_END = '21:00';
  const PICKUP_ORDER_CUTOFF_TIME = '21:00';
  const PICKUP_ORDER_CUTOFF_DAYS_BEFORE = 1;
  const PICKUP_TIME_FIXED = '11:00';
  const PICKUP_ADDRESS = 'Jl.Galunggung Blok G.9 No:13 Pondok Padalarang Indah, Bandung Barat';
  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
  const formatCurrency = (amount) => new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
  const LABELS = {
    side: 'Lauk Pendamping',
    spice: 'Tingkat Kepedasan',
    base: 'Karbohidrat',
    protein: 'Protein',
    veggie: 'Sayuran',
    topping: 'Topping',
    sauce: 'Saus'
  };
  const DEFAULT_MIN_ORDER = {
    'Sajian Nyalira': 10,
    'Sajian Ngariung': 10,
    'Sajian Prasmanan (Buffet / Catering Service)': 1
  };
  const DEFAULT_STEP = {
    'Sajian Nyalira': 1,
    'Sajian Ngariung': 5,
    'Sajian Prasmanan (Buffet / Catering Service)': 1
  };
  // Ditunda sampai skema paket katering selesai.
  const DRAFT_MENU = [
    {
      name: 'Catering Makan Siang Kantor',
      description: 'Untuk 10 sampai 12 orang, sudah termasuk minuman. [isi: jumlah lauk per orang]',
      price: 1200000,
      minOrder: 1
    },
    {
      name: 'Catering Acara Keluarga',
      description: 'Prasmanan untuk 20 sampai 25 orang. [isi: jumlah jenis lauk]',
      price: 2200000,
      minOrder: 1
    },
    {
      name: 'Catering Acara Premium',
      description: 'Hidangan, minuman, dan penataan meja untuk 40 orang atau lebih. [isi: yang termasuk dalam penataan]',
      price: 4500000,
      minOrder: 1
    }
  ];
  const CYO_DISHES_URL = 'Data/dishes.json';
  const CYO_PACKAGING_COSTS_URL = 'Data/packaging-costs.json';
  const CYO_CATEGORY_BY_TAB = {
    nasi: 'Nasi',
    laukUtama: 'Lauk Utama',
    laukPendamping: 'Lauk Pendamping',
    sayuran: 'Sayuran & Tumisan'
  };
  const CYO_BOX_TYPES = ['Nasi Kotak', 'Liwet', 'Tumpeng'];
  const CYO_ALL_BOX_TYPES = ['Semua Jenis Box', 'Semua Sajian Ngariung'];
  let cyoDishes = [];
  let cyoPackagingCosts = {};

  /* ---------- STATE ---------- */
  let cart = [];          // array of cart item objects
  let cartIdCounter = 0;

  const cyoState = {
    menuType: 'Sajian Nyalira',
    submenuId: 'nk-paket-a',
    submenuName: 'Kotak Ini',
    portion: 10,
    packaging: '',
    activeSection: 'section-1',
    activeCategory: 'nasi',
    sections: [],
    pelengkap: {
      sambal: '',
      buah: '',
      tambahan: []
    }
  };

  /* 
   * KONFIGURASI MENU & SUB-MENU (Craft Your Own)
   * Setiap menu utama memetakan jenis box untuk pilihan hidangan dan biaya kemasan.
   * Geometri layout dibaca langsung dari file SVG pada setiap sub-menu.
   */
  const CYO_CONFIG = {
    'Sajian Nyalira': {
      name: 'Sajian Nyalira',
      boxTypes: ['Nasi Kotak'],
      submenus: [
        {
          id: 'nk-paket-a',
          name: 'Kotak Ini',
          layoutTemplate: 'kotak-ini',
          svgFile: 'Assets/CYO Layout/kotak-ini.svg',
          sambalSectionId: 'section-6',
          sections: [
            { id: 'section-1', label: 'Bagian 1' },
            { id: 'section-2', label: 'Bagian 2' },
            { id: 'section-3', label: 'Bagian 3' },
            { id: 'section-4', label: 'Bagian 4' },
            { id: 'section-5', label: 'Bagian 5' },
            { id: 'section-6', label: 'Sambal' }
          ]
        },
        {
          id: 'nk-paket-b',
          name: 'Kotak itu',
          layoutTemplate: 'kotak-itu',
          svgFile: 'Assets/CYO Layout/kotak-itu.svg',
          sections: [
            { id: 'section-1', label: 'Bagian 1' },
            { id: 'section-2', label: 'Bagian 2' },
            { id: 'section-3', label: 'Bagian 3' },
            { id: 'section-4', label: 'Bagian 4' }
          ]
        },
        {
          id: 'nk-besekan',
          name: 'Besekan',
          layoutTemplate: 'besekan',
          svgFile: 'Assets/CYO Layout/Besekan.svg',
          sections: [
            { id: 'section-1', label: 'Bagian 1' },
            { id: 'section-2', label: 'Bagian 2' },
            { id: 'section-3', label: 'Bagian 3' },
            { id: 'section-4', label: 'Bagian 4' },
            { id: 'section-5', label: 'Bagian 5' },
            { id: 'section-6', label: 'Bagian 6' }
          ]
        },
        {
          id: 'nk-tumpeng-mini',
          name: 'Tumpeng Mini',
          layoutTemplate: 'tumpeng-mini',
          svgFile: 'Assets/CYO Layout/tumpeng-mini.svg',
          sambalSectionId: 'section-6',
          sections: [
            { id: 'section-1', label: 'Bagian 1' },
            { id: 'section-2', label: 'Bagian 2' },
            { id: 'section-3', label: 'Bagian 3' },
            { id: 'section-4', label: 'Bagian 4' },
            { id: 'section-5', label: 'Bagian 5' },
            { id: 'section-6', label: 'Sambal' }
          ]
        }
      ]
    },
    'Sajian Ngariung': {
      name: 'Sajian Ngariung',
      boxTypes: ['Liwet', 'Tumpeng'],
      submenus: [
        {
          id: 'ngariung-tempat-gini',
          name: 'Tempat Gini',
          layoutTemplate: 'tempat-gini',
          svgFile: 'Assets/CYO Layout/tempat-gini.svg',
          sambalSectionId: 'section-6',
          sections: [
            { id: 'section-1', label: 'Bagian 1' },
            { id: 'section-2', label: 'Bagian 2' },
            { id: 'section-3', label: 'Bagian 3' },
            { id: 'section-4', label: 'Bagian 4' },
            { id: 'section-5', label: 'Bagian 5' },
            { id: 'section-6', label: 'Sambal' }
          ]
        },
        {
          id: 'ngariung-tempat-gitu',
          name: 'Tempat Gitu',
          layoutTemplate: 'tempat-gitu',
          svgFile: 'Assets/CYO Layout/tempat-gitu.svg',
          sections: [
            { id: 'section-1', label: 'Bagian 1' },
            { id: 'section-2', label: 'Bagian 2' },
            { id: 'section-3', label: 'Bagian 3' },
            { id: 'section-4', label: 'Bagian 4' },
            { id: 'section-5', label: 'Bagian 5' }
          ]
        }
      ]
    }
  };

  const CYO_LAYOUT_TEMPLATES = new Map();
  let cyoLayoutTemplatesLoaded = false;
  let cyoPricingDataLoaded = false;

  const CYO_SVG_SHAPE_NAMES = new Set(['circle', 'ellipse', 'path', 'rect']);

  function getDirectSvgShape(group) {
    return Array.from(group.children).find((element) => CYO_SVG_SHAPE_NAMES.has(element.localName));
  }

  async function loadCyoLayoutTemplates() {
    const submenus = Object.values(CYO_CONFIG).flatMap((menu) => menu.submenus);
    await Promise.all(submenus.map(async (submenu) => {
      const response = await fetch(new URL(submenu.svgFile, document.baseURI));
      if (!response.ok) {
        throw new Error(`Gagal memuat layout SVG ${submenu.svgFile}: HTTP ${response.status}`);
      }

      const sourceBytes = new Uint8Array(await response.arrayBuffer());
      const isUtf16Le = sourceBytes[0] === 0xff && sourceBytes[1] === 0xfe;
      const isUtf16Be = sourceBytes[0] === 0xfe && sourceBytes[1] === 0xff;
      const sourceEncoding = isUtf16Be
        ? 'utf-16be'
        : isUtf16Le || sourceBytes[1] === 0
          ? 'utf-16le'
          : 'utf-8';
      const source = new TextDecoder(sourceEncoding).decode(sourceBytes);
      const sourceDocument = new DOMParser().parseFromString(source, 'image/svg+xml');
      if (sourceDocument.querySelector('parsererror')) {
        throw new Error(`File layout SVG tidak valid: ${submenu.svgFile}`);
      }

      const sourceSvg = sourceDocument.documentElement;
      const baseGroup = sourceSvg.querySelector('[id="Base"]');
      const sectionGroup = sourceSvg.querySelector('[id="Section"]');
      const baseShape = baseGroup && getDirectSvgShape(baseGroup);
      if (!sourceSvg.getAttribute('viewBox') || !baseShape || !sectionGroup) {
        throw new Error(`Layout SVG ${submenu.svgFile} harus memiliki viewBox, Base, dan Section`);
      }

      const sectionShapes = Array.from(sectionGroup.children)
        .filter((element) => CYO_SVG_SHAPE_NAMES.has(element.localName))
        .map((element) => {
          const match = element.id.match(/(\d+)(?:_(\d+))?$/);
          if (!match) {
            throw new Error(`ID kompartemen tidak valid di ${submenu.svgFile}: ${element.id}`);
          }
          return {
            order: [Number(match[1]), match[2] === undefined ? -1 : Number(match[2])],
            element
          };
        })
        .sort((first, second) => first.order[0] - second.order[0] || first.order[1] - second.order[1])
        .map((shape, index) => ({ id: `section-${index + 1}`, element: shape.element }));

      const sambalGroup = sourceSvg.querySelector('[id="Locked_x0020_Section"]');
      const sambalShape = sambalGroup && sambalGroup.querySelector('[id="Sambal"]');
      const shapes = sectionShapes.slice();
      if (sambalShape) {
        shapes.push({ id: `section-${shapes.length + 1}`, element: sambalShape });
      }

      const sectionIds = submenu.sections.map((section) => section.id);
      if (shapes.length !== sectionIds.length || shapes.some((shape, index) => shape.id !== sectionIds[index])) {
        throw new Error(`Jumlah atau ID section tidak cocok untuk layout ${submenu.svgFile}`);
      }
      if (Boolean(sambalShape) !== Boolean(submenu.sambalSectionId)) {
        throw new Error(`Konfigurasi section sambal tidak cocok untuk layout ${submenu.svgFile}`);
      }

      CYO_LAYOUT_TEMPLATES.set(submenu.layoutTemplate, {
        viewBox: sourceSvg.getAttribute('viewBox'),
        baseShape,
        shapes
      });
    }));
  }

  function updateCyoAddButtonState() {
    if (addCyoBtn) {
      addCyoBtn.disabled = !cyoLayoutTemplatesLoaded || !cyoPricingDataLoaded;
    }
  }

  function getCyoSambalImage(sambalName) {
    if (!sambalName || sambalName === 'Tanpa Sambal') return '';
    if (!cyoPricingDataLoaded) return '';
    const sambal = cyoDishes.find((dish) =>
      normalizeCyoFieldName(dish.category).startsWith(normalizeCyoFieldName('Pelengkap > Sambal'))
      && normalizeCyoFieldName(dish.name) === normalizeCyoFieldName(sambalName)
    );
    if (!sambal?.image) {
      console.error(`Gambar sambal tidak ditemukan: ${sambalName}`);
      return '';
    }
    return encodeURI(sambal.image);
  }

  function normalizeCyoFieldName(value) {
    return String(value).toLocaleLowerCase('id-ID').replace(/[^a-z0-9]/g, '');
  }

  function getCyoSubmenus() {
    return Object.values(CYO_CONFIG).flatMap((menu) => menu.submenus);
  }

  function getCyoField(record, aliases) {
    const entries = Object.entries(record).map(([key, value]) => [normalizeCyoFieldName(key), value]);
    const aliasNames = aliases.map(normalizeCyoFieldName);
    const match = entries.find(([key]) => aliasNames.includes(key));
    return match ? match[1] : undefined;
  }

  function getCyoPackagingCost(source, boxType) {
    const acceptedKeys = new Set([
      normalizeCyoFieldName(boxType),
      normalizeCyoFieldName(`Kemasan ${boxType}`)
    ]);
    const match = Object.entries(source).find(([key]) => acceptedKeys.has(normalizeCyoFieldName(key)));
    return match?.[1];
  }

  function parseCyoMoney(value, fieldName) {
    const amount = typeof value === 'number'
      ? value
      : Number(String(value).replace(/Rp/gi, '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.'));
    if (!Number.isFinite(amount) || amount < 0) {
      throw new Error(`Nilai ${fieldName} tidak valid: ${value}`);
    }
    return amount;
  }

  function normalizeCyoDish(record, index) {
    if (!record || typeof record !== 'object' || Array.isArray(record)) {
      throw new Error(`Data dish ke-${index + 1} harus berupa objek`);
    }

    const rawCategory = String(getCyoField(record, ['category', 'kategori']) || '').trim();
    const category = Object.values(CYO_CATEGORY_BY_TAB).find(
      (supportedCategory) => normalizeCyoFieldName(supportedCategory) === normalizeCyoFieldName(rawCategory)
    ) || (
      rawCategory.toLocaleLowerCase('id-ID').startsWith('pelengkap') ? rawCategory : null
    );
    if (!category) throw new Error(`Kategori dish ke-${index + 1} tidak dikenal: ${rawCategory}`);

    const rawBoxTypes = getCyoField(record, [
      'boxTypes', 'boxType', 'jenisBox', 'jenisKotak', 'jenisBoxYangBisaDipakai', 'menuTypes'
    ]);
    const requestedBoxTypes = (Array.isArray(rawBoxTypes) ? rawBoxTypes : String(rawBoxTypes || '').split(',')
    ).map((boxType) => String(boxType).trim()).filter(Boolean);
    const knownBoxTypes = [
      ...CYO_BOX_TYPES,
      ...CYO_ALL_BOX_TYPES,
      ...getCyoSubmenus().map((submenu) => submenu.name)
    ];
    const boxTypes = requestedBoxTypes.map((requestedType) => knownBoxTypes.find(
      (boxType) => normalizeCyoFieldName(boxType) === normalizeCyoFieldName(requestedType)
    ));
    if (boxTypes.some((boxType) => !boxType)) {
      throw new Error(`Jenis box dish ke-${index + 1} tidak dikenal: ${requestedBoxTypes.join(', ')}`);
    }
    if (!boxTypes.length) throw new Error(`Jenis box dish ke-${index + 1} kosong atau tidak dikenal`);

    const name = String(getCyoField(record, [
      'name', 'dishName', 'namaDish', 'namaMenu', 'menuName', 'dish', 'nama'
    ]) || '').trim();
    if (!name) throw new Error(`Nama dish ke-${index + 1} kosong`);
    const rawHpp = getCyoField(record, ['hppPerPortion', 'hppPerPorsi', 'hppPerPorsiRp', 'hpp']);
    return {
      id: `dish-${index}`,
      category,
      boxTypes: [...new Set(boxTypes)],
      name,
      hppPerPortion: rawHpp === undefined || rawHpp === null || rawHpp === ''
        ? 0
        : parseCyoMoney(rawHpp, `HPP "${name}"`),
      image: String(getCyoField(record, ['image', 'gambar']) || '').trim()
    };
  }

  function normalizeCyoPackagingCosts(data) {
    const source = data && typeof data === 'object' && !Array.isArray(data)
      ? (data.packagingCosts || data.biayaKemasan || data)
      : null;
    if (!source || typeof source !== 'object' || Array.isArray(source)) {
      throw new Error('Data biaya kemasan harus berupa objek berdasarkan jenis box');
    }

    const costs = {};
    getCyoSubmenus().forEach((submenu) => {
      const value = getCyoPackagingCost(source, submenu.name);
      if (value === undefined) throw new Error(`Biaya kemasan untuk ${submenu.name} belum tersedia`);
      costs[submenu.name] = parseCyoMoney(value, `biaya kemasan ${submenu.name}`);
    });
    return costs;
  }

  async function loadCyoPricingData() {
    const [dishesResponse, packagingResponse] = await Promise.all([
      fetch(CYO_DISHES_URL),
      fetch(CYO_PACKAGING_COSTS_URL)
    ]);
    if (!dishesResponse.ok) throw new Error(`Gagal memuat ${CYO_DISHES_URL}: HTTP ${dishesResponse.status}`);
    if (!packagingResponse.ok) throw new Error(`Gagal memuat ${CYO_PACKAGING_COSTS_URL}: HTTP ${packagingResponse.status}`);

    const [dishesData, packagingData] = await Promise.all([
      dishesResponse.json(),
      packagingResponse.json()
    ]);
    const dishRows = Array.isArray(dishesData) ? dishesData : dishesData?.dishes;
    if (!Array.isArray(dishRows) || !dishRows.length) {
      throw new Error(`${CYO_DISHES_URL} harus berisi daftar dish`);
    }

    const loadedDishes = dishRows.map(normalizeCyoDish);
    const packagingCosts = normalizeCyoPackagingCosts(packagingData);
    cyoDishes = loadedDishes;
    cyoPackagingCosts = packagingCosts;
  }

  /* ---------- DOM REFS ---------- */
  const header = document.getElementById('site-header');
  const hamburgerBtn = document.getElementById('hamburger-btn');
  const mainNav = document.getElementById('main-nav');

  const cartToggleBtn = document.getElementById('cart-toggle-btn');
  const cartCloseBtn = document.getElementById('cart-close-btn');
  const cartOverlay = document.getElementById('cart-overlay');
  const cartPanel = document.getElementById('cart-panel');
  const cartItemsEl = document.getElementById('cart-items');
  const emptyCartMsg = document.getElementById('empty-cart-msg');
  const cartCountEl = document.getElementById('cart-count');
  const cartTotalEl = document.getElementById('cart-total');
  const orderWhatsappBtn = document.getElementById('order-whatsapp-btn');
  const customerNameInput = document.getElementById('customer-name');
  const deliveryDateInput = document.getElementById('delivery-date');
  const deliveryDateNativeInput = document.getElementById('delivery-date-native');
  const deliveryTimeSelect = document.getElementById('delivery-time');
  const deliveryScheduleGrid = document.getElementById('delivery-schedule-grid');
  const deliveryDateLabel = document.getElementById('delivery-date-label');
  const deliveryTimeField = document.getElementById('delivery-time-field');
  const deliveryDateDisplay = document.getElementById('delivery-date-display');
  const customerAddressInput = document.getElementById('customer-address');
  const deliveryAddressField = document.getElementById('delivery-address-field');
  const pickupDetails = document.getElementById('pickup-details');
  const pickupTimeText = document.getElementById('pickup-time-text');
  const pickupAddressText = document.getElementById('pickup-address-text');
  const customerNotesInput = document.getElementById('customer-notes');
  const cartDepositEl = document.getElementById('cart-deposit');
  const cartPaymentLabel = document.getElementById('cart-payment-label');

  const cyoLayout = document.getElementById('cyo-layout');
  const cyoLayoutName = document.getElementById('cyo-layout-name');
  const cyoSection = document.getElementById('cyo');
  const cyoPickerCloseBtn = document.getElementById('cyo-picker-close');
  const cyoPickerBackdrop = document.getElementById('cyo-options-backdrop');
  const cyoIngredientsList = document.getElementById('cyo-ingredients-list');
  const cyoPackagingPriceEl = document.getElementById('cyo-packaging-price');
  const cyoRecapCount = document.getElementById('cyo-recap-count');
  const cyoRecapEmpty = document.getElementById('cyo-recap-empty');
  const cyoSubMenuTypes = document.getElementById('cyo-sub-menu-types');
  const cyoOptions = document.getElementById('cyo-options');
  const cyoUnitPriceEl = document.getElementById('cyo-unit-price');
  const cyoUnitTotalEl = document.getElementById('cyo-unit-total');
  const cyoPortionInput = document.getElementById('cyo-portion-input');
  const cyoPortionLabel = document.getElementById('cyo-portion-label');
  const cyoPackagingControl = document.getElementById('cyo-packaging-control');
  const cyoPackagingSelect = document.getElementById('cyo-packaging-select');
  const cyoOrderSummary = document.querySelector('.cyo-order-summary');
  const cyoSubtotalEl = document.getElementById('cyo-subtotal');
  const addCyoBtn = document.getElementById('add-cyo-btn');
  const cyoActiveSectionTarget = document.getElementById('cyo-active-section-target');
  const cyoClearSectionBtn = document.getElementById('cyo-clear-section-btn');
  const cyoResetSectionsBtn = document.getElementById('cyo-reset-sections-btn');
  const cyoSelectSambal = document.getElementById('cyo-select-sambal');
  const cyoSelectBuah = document.getElementById('cyo-select-buah');
  const cyoPelengkapCheckboxes = document.getElementById('cyo-pelengkap-checkboxes');
  const cyoPelengkapRecapText = document.getElementById('cyo-pelengkap-recap-text');
  let cyoPreviousBodyOverflow = '';

  /* =========================================================
     INIT
     ========================================================= */
  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('year').textContent = new Date().getFullYear();
    initNav();
    initMenuHeaderBehavior();
    initCart();
    initRegularAndCatering();
    initMenuSearch();
    initCyoBuilder();
    initRevealAnimations();
    initCategoryNavigation();
    initSubcategoryNavigation();
    initDeliveryDate();
    updateCartUI();
  });

  /* =========================================================
     NAVIGATION (mobile hamburger & category/subcategory tabs)
     ========================================================= */
  function initNav() {
    hamburgerBtn.addEventListener('click', () => {
      hamburgerBtn.classList.toggle('open');
      mainNav.classList.toggle('open');
    });

    // Close mobile nav when a link is clicked
    mainNav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        hamburgerBtn.classList.remove('open');
        mainNav.classList.remove('open');
      });
    });
  }

  function initMenuHeaderBehavior() {
    const menuSection = document.getElementById('menus');
    if (!menuSection) return;

    let previousScrollY = window.scrollY;

    const updateHeader = (isScrollingUp = false) => {
      const isMobile = window.matchMedia('(max-width: 760px)').matches;
      const bounds = menuSection.getBoundingClientRect();
      const headerHeight = header.getBoundingClientRect().height;
      const isMenuInView = bounds.top <= 0 && bounds.bottom > headerHeight;

      if (!isMobile || !isMenuInView) {
        header.classList.remove('menu-scrolling');
        return;
      }

      header.classList.toggle('menu-scrolling', !isScrollingUp);
    };

    window.addEventListener('scroll', () => {
      const currentScrollY = window.scrollY;
      updateHeader(currentScrollY < previousScrollY);
      previousScrollY = currentScrollY;
    }, { passive: true });
    window.addEventListener('resize', updateHeader);
    updateHeader();
  }

  function initRevealAnimations() {
    const revealItems = document.querySelectorAll('.hero-copy, .hero-visual, .menu-category, .menu-card, .cyo-step, .cyo-preview, .about-inner, .contact-inner');

    revealItems.forEach((item, index) => {
      item.classList.add('reveal-item');
      item.style.setProperty('--reveal-delay', `${Math.min(index % 6, 5) * 70}ms`);
    });

    if (!('IntersectionObserver' in window)) {
      revealItems.forEach((item) => item.classList.add('is-visible'));
      return;
    }

    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px' });

    revealItems.forEach((item) => revealObserver.observe(item));
  }

  function initCategoryNavigation() {
    const categoryLinks = [...document.querySelectorAll('.menu-jump a:not([hidden])')];
    const categories = [...document.querySelectorAll('.menu-category:not([hidden])')];

    if (!categoryLinks.length || !categories.length) return;

    function showCategory(targetId) {
      categories.forEach((category) => {
        const isMatch = category.id === targetId;
        category.style.display = isMatch ? 'block' : 'none';
        category.classList.toggle('active-tab-category', isMatch);
      });

      categoryLinks.forEach((link) => {
        const isMatch = link.getAttribute('href') === `#${targetId}`;
        link.classList.toggle('active', isMatch);
      });
    }

    // Default: show first category
    showCategory(categories[0].id);

    categoryLinks.forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('href').slice(1);
        showCategory(targetId);

        const menuSection = document.getElementById('menus');
        if (menuSection) {
          const rect = menuSection.getBoundingClientRect();
          if (rect.top < -20 || rect.top > 200) {
            window.scrollTo({
              top: window.pageYOffset + rect.top,
              behavior: 'smooth'
            });
          }
        }
      });
    });
  }

  function initSubcategoryNavigation() {
    const navStates = [...document.querySelectorAll('.subcategory-nav')].map((nav) => {
      const buttons = [...nav.querySelectorAll('.subcategory-pill')];
      const sections = buttons.map((button) => ({
        button,
        heading: document.getElementById(button.dataset.subTarget)
      })).filter((section) => section.heading);
      let currentActiveButton = buttons.find((button) => button.classList.contains('active'));

      const setActive = (activeButton, ensureVisible = false) => {
        const activeChanged = activeButton !== currentActiveButton;
        currentActiveButton = activeButton;

        buttons.forEach((button) => {
          const isActive = button === activeButton;
          button.classList.toggle('active', isActive);
          button.setAttribute('aria-pressed', String(isActive));
        });

        if ((activeChanged || ensureVisible) && window.matchMedia('(max-width: 760px)').matches) {
          const buttonRect = activeButton.getBoundingClientRect();
          const navRect = nav.getBoundingClientRect();
          if (buttonRect.left < navRect.left || buttonRect.right > navRect.right) {
            nav.scrollBy({
              left: buttonRect.left - navRect.left - (nav.clientWidth - activeButton.clientWidth) / 2,
              behavior: 'smooth'
            });
          }
        }
      };

      buttons.forEach((button) => {
        button.setAttribute('aria-pressed', String(button.classList.contains('active')));
        button.addEventListener('click', () => {
          setActive(button, true);
          const targetEl = document.getElementById(button.dataset.subTarget);
          if (targetEl) {
            const navOffset = window.matchMedia('(max-width: 760px)').matches
              ? (document.querySelector('.menu-jump')?.offsetHeight || 0) + nav.offsetHeight
              : 205;
            const elementPosition = targetEl.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - navOffset;

            window.scrollTo({
              top: offsetPosition,
              behavior: 'smooth'
            });
          }
        });
      });

      return { nav, sections, setActive };
    });

    window.addEventListener('scroll', () => {
      navStates.forEach(({ nav, sections, setActive }) => {
        const category = nav.closest('.menu-category');
        if (!category || category.offsetParent === null || !sections.length) return;

        const activationLine = nav.getBoundingClientRect().bottom + 24;
        let activeSection = sections[0];
        sections.forEach((section) => {
          if (section.heading.getBoundingClientRect().top <= activationLine) {
            activeSection = section;
          }
        });
        setActive(activeSection.button);
      });
    }, { passive: true });
  }

  /* =========================================================
     CART PERSISTENCE & PANEL
     ========================================================= */
  const CART_STORAGE_KEY = 'dapur_ambu_cart';
    const CART_CHECKOUT_PENDING_KEY = 'dapur_ambu_checkout_pending';
    let cartHistoryEntryOpen = false;

  function saveCartToStorage() {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (e) {
      console.error('Gagal menyimpan cart:', e);
    }
  }

  function loadCartFromStorage() {
    try {
      if (sessionStorage.getItem(CART_CHECKOUT_PENDING_KEY) === '1') {
        sessionStorage.removeItem(CART_CHECKOUT_PENDING_KEY);
        localStorage.removeItem(CART_STORAGE_KEY);
        cart = [];
        return;
      }

      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (saved) {
        cart = JSON.parse(saved);
        if (Array.isArray(cart) && cart.length > 0) {
          enrichCartItemsFromProducts();
          const maxId = cart.reduce((max, item) => Math.max(max, item.id || 0), 0);
          cartIdCounter = maxId;
        }
      }
    } catch (e) {
      console.error('Gagal membaca cart:', e);
      cart = [];
    }
  }

  function initCart() {
    loadCartFromStorage();
    cartToggleBtn.addEventListener('click', openCart);
    cartCloseBtn.addEventListener('click', closeCart);
    cartOverlay.addEventListener('click', closeCart);
    orderWhatsappBtn.addEventListener('click', handleWhatsAppCheckout);
    window.addEventListener('popstate', handleCartPopState);
    window.addEventListener('focus', resetCartAfterWhatsAppReturn);
    window.addEventListener('pageshow', resetCartAfterWhatsAppReturn);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') resetCartAfterWhatsAppReturn();
    });
  }

  function openCart() {
    if (!cartPanel.classList.contains('active')) {
      const currentState = window.history.state;
      const nextState = currentState && typeof currentState === 'object' ? { ...currentState } : {};
      nextState.__dapurAmbuCartOpen = true;
      window.history.pushState(nextState, '', window.location.href);
      cartHistoryEntryOpen = true;
    }

    showCartPanel();
  }

  function showCartPanel() {
    cartPanel.classList.add('active');
    cartOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeCart() {
    const shouldReturnInHistory = cartHistoryEntryOpen;
    cartHistoryEntryOpen = false;
    hideCartPanel();

    if (shouldReturnInHistory) window.history.back();
  }

  function hideCartPanel() {
    cartPanel.classList.remove('active');
    cartOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  function handleCartPopState(event) {
    if (event.state?.__dapurAmbuCartOpen) {
      cartHistoryEntryOpen = true;
      showCartPanel();
      return;
    }

    if (cartHistoryEntryOpen) {
      cartHistoryEntryOpen = false;
      hideCartPanel();
    }
  }

  function resetCartAfterWhatsAppReturn() {
    if (sessionStorage.getItem(CART_CHECKOUT_PENDING_KEY) !== '1') return;

    sessionStorage.removeItem(CART_CHECKOUT_PENDING_KEY);
    cart = [];
    updateCartUI();
  }

  /* =========================================================
     REGULAR RICEBOX + CATERING — "Add to Order" buttons
     ========================================================= */
  function initRegularAndCatering() {
    document.querySelectorAll('.menu-card[data-price]').forEach((card) => {
      initMenuQuantity(card);
    });

    document.querySelectorAll('.btn-add').forEach((btn) => {
      btn.addEventListener('click', () => {
        const card = btn.closest('.menu-card');
        const type = btn.dataset.type; // 'regular' | 'catering'
        const name = card.dataset.name;
        const price = parseFloat(card.dataset.price);
        const quantity = getMenuQuantity(card);
        const pickupOnly = card.dataset.pickupOnly === 'true';

        if ((pickupOnly && cart.length > 0) || cart.some((item) => item.pickupOnly)) {
          showToast('Berkah Box hanya bisa dipesan sendiri, tidak bisa digabung dengan menu lain. Kosongkan keranjang terlebih dahulu.');
          return;
        }

        if (!isMenuQuantityValid(card)) {
          card.querySelector('[data-menu-quantity]').focus();
          const step = getMenuStep(card);
          const min = getMenuMinOrder(card);
          showToast(step > 1
            ? `Minimal order adalah ${min} dan kelipatan ${step}`
            : `Minimal order adalah ${min}`);
          return;
        }

        let details = [];
        const basicBoxChoices = [...card.querySelectorAll('.basic-box-choice')];
        const hasBasicBoxChoices = basicBoxChoices.length > 0;
        let selectedBasicBoxValues = [];

        if (hasBasicBoxChoices) {
          const missingChoice = basicBoxChoices.find((select) => !select.value);
          if (missingChoice) {
            missingChoice.classList.add('invalid');
            missingChoice.focus();
            showToast('Pilih Lauk Utama, Pendamping, dan Tumisan terlebih dahulu');
            return;
          }
          selectedBasicBoxValues = basicBoxChoices.map((select) => select.value);
        }

        const liwetChoices = [...card.querySelectorAll('.liwet-choice')];
        const hasLiwetChoices = liwetChoices.length > 0;
        if (hasLiwetChoices) {
          const missingChoice = liwetChoices.find((select) => !select.value);
          if (missingChoice) {
            missingChoice.classList.add('invalid');
            missingChoice.focus();
            showToast('Pilih kemasan terlebih dahulu');
            return;
          }
        }

        if (card.dataset.category) {
          const category = card.dataset.subcategory
            ? `${card.dataset.category} - ${card.dataset.subcategory}`
            : card.dataset.category;
          details.push(`Kategori: ${category}`);
        }

        if (hasLiwetChoices) {
          liwetChoices.forEach((select) => {
            details.push(`Kemasan: ${select.value}`);
          });
        }

        if (type === 'regular') {
          // Collect selected option dropdowns (side, spice, etc.)
          card.querySelectorAll('.option-select').forEach((select) => {
            const optionType = select.dataset.option; // e.g. "side", "spice"
            const label = LABELS[optionType] || optionType;
            details.push(`${label}: ${select.value}`);
          });
        } else if (hasBasicBoxChoices) {
          const [laukUtama, pendamping, tumisan] = selectedBasicBoxValues;
          const menuDescription = [
            'Nasi Putih',
            laukUtama,
            pendamping,
            tumisan,
            'Sambal Ambu',
            'Lalapan',
            ...(name === 'Ambu Basic Box 2'
              ? ['Kerupuk', 'Air Minum Kemasan', 'Pisang']
              : [])
          ];
          details.push(`Deskripsi: ${menuDescription.join(', ')}`);
        } else if (type === 'catering') {
          details.push('Paket katering lengkap');
        }

        const cartDateWasCleared = addToCart({
          id: ++cartIdCounter,
          type,
          productId: card.dataset.productId || '',
          fridayOnly: card.dataset.fridayOnly === 'true',
          pickupOnly: card.dataset.pickupOnly === 'true',
          category: card.dataset.category
            ? (card.dataset.subcategory ? `${card.dataset.category} - ${card.dataset.subcategory}` : card.dataset.category)
            : '',
          description: card.querySelector('.menu-card-desc')?.textContent.trim() || '',
          name,
          price,
          qty: quantity,
          minQty: getMenuMinOrder(card),
          step: getMenuStep(card),
          details, // array of strings
          compartments: null
        });

        if (cartDateWasCleared !== null && !cartDateWasCleared) {
          showToast(`${quantity} x ${name} ditambahkan ke pesanan`);
        }
      });
    });
  }

  function initMenuSearch() {
    const form = document.getElementById('menu-search-form');
    const input = document.getElementById('menu-search-input');
    const results = document.getElementById('menu-search-results');
    if (!form || !input || !results) return;

    const cards = [...document.querySelectorAll('.menu-card[data-name]')]
      .filter((card) => !card.closest('.menu-category[hidden]'));
    const closeResults = () => {
      results.hidden = true;
      input.setAttribute('aria-expanded', 'false');
    };

    const showResults = (query) => {
      results.replaceChildren();
      const normalizedQuery = query.trim().toLocaleLowerCase('id');
      if (!normalizedQuery) {
        closeResults();
        return [];
      }

      const matches = cards.map((card) => {
        const name = card.dataset.name || '';
        const description = card.querySelector('.menu-card-desc')?.textContent || '';
        const searchableText = [
          name,
          description
        ].join(' ').toLocaleLowerCase('id');
        return {
          card,
          nameMatches: name.toLocaleLowerCase('id').includes(normalizedQuery),
          isMatch: searchableText.includes(normalizedQuery)
        };
      })
        .filter((match) => match.isMatch)
        .sort((a, b) => Number(b.nameMatches) - Number(a.nameMatches))
        .map((match) => match.card);

      results.hidden = false;
      input.setAttribute('aria-expanded', 'true');

      if (!matches.length) {
        const emptyMessage = document.createElement('p');
        emptyMessage.className = 'menu-search-empty';
        emptyMessage.setAttribute('role', 'status');
        emptyMessage.textContent = 'Menu tidak ditemukan. Coba kata kunci lain.';
        results.append(emptyMessage);
        return matches;
      }

      matches.slice(0, 6).forEach((card) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'menu-search-result';
        button.setAttribute('role', 'option');

        const nameRow = document.createElement('span');
        nameRow.className = 'menu-search-result-name';
        const name = document.createElement('span');
        name.textContent = card.dataset.name;
        const price = document.createElement('strong');
        price.textContent = formatCurrency(Number(card.dataset.price));
        nameRow.append(name, price);

        const description = document.createElement('span');
        description.className = 'menu-search-result-description';
        description.textContent = card.querySelector('.menu-card-desc')?.textContent || '';

        button.append(nameRow, description);
        button.addEventListener('click', () => {
          closeResults();
          input.value = '';
          navigateToMenuCard(card);
        });
        results.append(button);
      });

      return matches;
    };

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const matches = showResults(input.value);
      if (matches.length) {
        closeResults();
        input.value = '';
        navigateToMenuCard(matches[0]);
      }
    });

    input.addEventListener('input', () => showResults(input.value));
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeResults();
    });
    document.addEventListener('click', (event) => {
      if (!form.contains(event.target)) closeResults();
    });
  }

  function navigateToMenuCard(card) {
    const category = card.closest('.menu-category');
    const categoryLink = [...document.querySelectorAll('.menu-jump a')]
      .find((link) => link.getAttribute('href') === `#${category?.id}`);
    categoryLink?.click();

    const subcategoryHeading = card.closest('.card-grid')?.previousElementSibling;
    if (subcategoryHeading?.id) {
      const subcategoryButton = category?.querySelector(`[data-sub-target="${subcategoryHeading.id}"]`);
      subcategoryButton?.click();
    }

    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    card.classList.add('menu-card-search-match');
    window.setTimeout(() => card.classList.remove('menu-card-search-match'), 1800);
  }

  function getMenuMinOrder(card) {
    const configuredMinimum = parseInt(card.dataset.minOrder, 10);
    if (Number.isFinite(configuredMinimum) && configuredMinimum > 0) return configuredMinimum;
    return DEFAULT_MIN_ORDER[card.dataset.category] || 1;
  }

  function getMenuStep(card) {
    const configuredStep = parseInt(card.dataset.step, 10);
    if (Number.isFinite(configuredStep) && configuredStep > 0) return configuredStep;
    return DEFAULT_STEP[card.dataset.category] || 1;
  }

  function getMenuQuantity(card) {
    return Math.max(getMenuMinOrder(card), parseInt(card.dataset.quantity, 10) || getMenuMinOrder(card));
  }

  function isMenuQuantityValid(card) {
    const quantityEl = card.querySelector('[data-menu-quantity]');
    const quantity = parseInt(quantityEl?.value, 10);
    const minimum = getMenuMinOrder(card);
    const step = getMenuStep(card);
    return Number.isInteger(quantity) && quantity >= minimum && ((quantity - minimum) % step === 0);
  }

  function updateMenuSubtotal(card) {
    const quantity = getMenuQuantity(card);
    const price = parseFloat(card.dataset.price);
    const subtotalEl = card.querySelector('[data-menu-subtotal]');
    const quantityEl = card.querySelector('[data-menu-quantity]');
    const minusBtn = card.querySelector('[data-quantity-action="decrease"]');

    if (quantityEl) quantityEl.value = quantity;
    if (subtotalEl) subtotalEl.textContent = formatCurrency(price * quantity);
    if (minusBtn) minusBtn.disabled = quantity <= getMenuMinOrder(card);
  }

  function initMenuQuantity(card) {
    const minimum = getMenuMinOrder(card);
    const step = getMenuStep(card);
    card.dataset.quantity = minimum;

    const footer = card.querySelector('.menu-card-footer');
    const priceRow = document.createElement('div');
    priceRow.className = 'menu-card-price-row';
    const minimumOrder = document.createElement('div');
    minimumOrder.className = 'minimum-order';
    minimumOrder.innerHTML = `<span>Min. Order:</span><strong>${minimum}</strong>`;
    priceRow.append(footer.querySelector('.price'), minimumOrder);

    const controls = document.createElement('div');
    controls.className = 'menu-order-controls';
    controls.innerHTML = `
      <div class="quantity-control" aria-label="Jumlah pesanan">
        <button type="button" data-quantity-action="decrease" aria-label="Kurangi jumlah" disabled>&minus;</button>
        <input type="number" data-menu-quantity min="${minimum}" step="${step}" value="${minimum}" inputmode="numeric" aria-label="Jumlah pesanan, minimal ${minimum}">
        <button type="button" data-quantity-action="increase" aria-label="Tambah jumlah">+</button>
      </div>
      <div class="menu-subtotal">
        <span>Subtotal</span>
        <strong data-menu-subtotal>${formatCurrency(parseFloat(card.dataset.price) * minimum)}</strong>
      </div>
    `;
    footer.before(priceRow, controls);

    controls.querySelectorAll('[data-quantity-action]').forEach((button) => {
      button.addEventListener('click', () => {
        const action = button.dataset.quantityAction;
        const currentQuantity = getMenuQuantity(card);
        const cardStep = getMenuStep(card);
        const cardMin = getMenuMinOrder(card);
        card.dataset.quantity = action === 'increase'
          ? currentQuantity + cardStep
          : Math.max(cardMin, currentQuantity - cardStep);
        updateMenuSubtotal(card);
      });
    });

    const quantityInput = controls.querySelector('[data-menu-quantity]');
    quantityInput.addEventListener('input', () => {
      const quantity = parseInt(quantityInput.value, 10);
      const isValid = Number.isInteger(quantity) && quantity >= minimum && ((quantity - minimum) % step === 0);
      quantityInput.classList.toggle('invalid', !isValid);

      if (isValid) {
        card.dataset.quantity = quantity;
        updateMenuSubtotal(card);
      }
    });

    card.querySelectorAll('.basic-box-choice, .liwet-choice').forEach((select) => {
      select.setAttribute('aria-label', select.options[0]?.text.replace(/^Pilih\s+/i, '') || 'Pilihan menu');
      select.addEventListener('change', () => {
        select.classList.toggle('invalid', !select.value);
      });
    });

    quantityInput.addEventListener('blur', () => {
      const quantity = parseInt(quantityInput.value, 10);
      if (!Number.isInteger(quantity) || quantity < minimum) {
        card.dataset.quantity = minimum;
      } else if (step > 1 && (quantity - minimum) % step !== 0) {
        const snapped = minimum + Math.round((quantity - minimum) / step) * step;
        card.dataset.quantity = Math.max(minimum, snapped);
      }
      quantityInput.classList.remove('invalid');
      updateMenuSubtotal(card);
    });

    updateMenuSubtotal(card);
  }

  /* =========================================================
     CRAFT YOUR OWN — BENTO BUILDER
     ========================================================= */
  function initCyoBuilder() {
    const menuTypeButtons = Array.from(document.querySelectorAll('.cyo-menu-type'));
    menuTypeButtons.forEach((button) => {
      button.disabled = true;
      button.addEventListener('click', () => {
        menuTypeButtons.forEach((item) => {
          item.classList.remove('active');
          item.setAttribute('aria-selected', 'false');
        });
        button.classList.add('active');
        button.setAttribute('aria-selected', 'true');
        cyoState.menuType = button.dataset.menuType;
        cyoState.packaging = '';
        if (cyoPackagingSelect) cyoPackagingSelect.value = '';
        updateCyoPackagingControl();
        setCyoPortion(cyoState.portion);

        // Default to first sub-menu of the chosen menu type
        const submenus = CYO_CONFIG[cyoState.menuType]?.submenus || [];
        const defaultSubmenu = submenus[0];
        if (defaultSubmenu) {
          setSubmenu(defaultSubmenu.id);
        }
      });
    });

    // Category tabs switching (Nasi, Lauk Utama, Lauk Pendamping, Sayuran & Tumisan)
    document.querySelectorAll('.cyo-category-tab').forEach((button) => {
      button.addEventListener('click', () => {
        setCyoActiveCategory(button.dataset.cyoCategory);
        renderCyoOptions();
      });
    });

    cyoPickerCloseBtn?.addEventListener('click', closeCyoIngredientPicker);
    cyoPickerBackdrop?.addEventListener('click', closeCyoIngredientPicker);
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeCyoIngredientPicker();
    });
    window.addEventListener('resize', () => {
      if (!window.matchMedia('(max-width: 600px)').matches) closeCyoIngredientPicker();
    });

    // Portion quantity controls
    document.getElementById('cyo-portion-decrease')?.addEventListener('click', () => setCyoPortion(cyoState.portion - getCyoPortionStep()));
    document.getElementById('cyo-portion-increase')?.addEventListener('click', () => setCyoPortion(cyoState.portion + getCyoPortionStep()));
    cyoPortionInput?.addEventListener('change', () => setCyoPortion(Number(cyoPortionInput.value)));
    cyoPackagingSelect?.addEventListener('change', () => {
      cyoState.packaging = cyoPackagingSelect.value;
      updateCyoSummary();
    });

    // Clear active section button
    cyoClearSectionBtn?.addEventListener('click', clearActiveSection);
    cyoResetSectionsBtn?.addEventListener('click', resetCyoSections);

    // Pelengkap controls & auto recap
    initPelengkapControls();

    // Add to cart button
    addCyoBtn?.addEventListener('click', addCyoToCart);

    updateCyoAddButtonState();
    Promise.all([loadCyoLayoutTemplates(), loadCyoPricingData()])
      .then(() => {
        cyoLayoutTemplatesLoaded = true;
        cyoPricingDataLoaded = true;
        const initialSubmenu = CYO_CONFIG[cyoState.menuType]?.submenus[0];
        if (initialSubmenu) setSubmenu(initialSubmenu.id);
        renderCyoPelengkapOptions();
        renderCyoLayout();
        renderCyoOptions();
        updateCyoPackagingControl();
        setCyoPortion(cyoState.portion);
        updateCyoSummary();
        menuTypeButtons.forEach((button) => {
          button.disabled = false;
        });
        updateCyoAddButtonState();
      })
      .catch((error) => {
        console.error('Gagal memuat layout atau data harga racik menu:', error);
        if (cyoOptions) cyoOptions.textContent = 'Layout atau data harga menu belum dapat dimuat. Silakan muat ulang halaman.';
        [cyoSelectSambal, cyoSelectBuah].forEach((select) => {
          if (select?.options.length) {
            select.options[0].textContent = 'Pilihan gagal dimuat. Muat ulang halaman.';
          }
        });
        showToast('Layout atau data harga menu tidak dapat dimuat');
      });
  }

  /* Render tombol sub-menu untuk kategori menu aktif */
  function renderCyoSubmenus() {
    if (!cyoSubMenuTypes) return;
    const menuData = CYO_CONFIG[cyoState.menuType];
    if (!menuData || !menuData.submenus) return;

    cyoSubMenuTypes.innerHTML = menuData.submenus.map((sub) => `
      <button class="cyo-sub-menu-btn ${sub.id === cyoState.submenuId ? 'active' : ''}" data-submenu-id="${sub.id}" type="button" role="tab" aria-selected="${sub.id === cyoState.submenuId}">
        ${sub.name}
      </button>
    `).join('');

    cyoSubMenuTypes.querySelectorAll('.cyo-sub-menu-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        setSubmenu(btn.dataset.submenuId);
      });
    });
  }

  /* Switch sub-menu dan set layout serta section-nya */
  function setSubmenu(submenuId) {
    const menuData = CYO_CONFIG[cyoState.menuType];
    const submenu = menuData?.submenus.find((s) => s.id === submenuId) || menuData?.submenus[0];
    if (!submenu) return;

    cyoState.submenuId = submenu.id;
    cyoState.submenuName = submenu.name;
    cyoState.sections = submenu.sections.map((sec) => ({
      id: sec.id,
      label: sec.label,
      selection: null
    }));
    cyoState.activeSection = submenu.sambalSectionId
      ? null
      : cyoState.sections[0]?.id || 'section-1';

    renderCyoSubmenus();
    renderCyoLayout();
    renderCyoOptions();
    if (cyoPricingDataLoaded) renderCyoPelengkapOptions();
    updateCyoSummary();
  }

  /* Render layout SVG bento box */
  function renderCyoLayout() {
    const submenu = CYO_CONFIG[cyoState.menuType]?.submenus.find((item) => item.id === cyoState.submenuId);
    const layoutTemplate = submenu && CYO_LAYOUT_TEMPLATES.get(submenu.layoutTemplate);
    const svgElement = cyoLayout?.querySelector('svg');
    const baseElement = cyoLayout?.querySelector('.cyo-svg-base');
    const sectionLayer = cyoLayout?.querySelector('.cyo-svg-sections');
    if (!layoutTemplate || !svgElement || !baseElement || !sectionLayer) {
      throw new Error(`Template layout CYO tidak ditemukan untuk ${cyoState.menuType} / ${cyoState.submenuName}`);
    }

    const templatePathIds = layoutTemplate.shapes.map((shape) => shape.id);
    const sectionIds = cyoState.sections.map((section) => section.id);
    if (templatePathIds.length !== sectionIds.length || templatePathIds.some((id) => !sectionIds.includes(id))) {
      throw new Error(`Jumlah atau ID section tidak cocok untuk layout ${submenu.layoutTemplate}`);
    }

    svgElement.setAttribute('viewBox', layoutTemplate.viewBox);
    const viewBoxWidth = Number(layoutTemplate.viewBox.split(/\s+/)[2]);
    const strokeScale = viewBoxWidth / 10000;
    svgElement.style.setProperty('--cyo-svg-stroke-width', String(28 * strokeScale));
    svgElement.style.setProperty('--cyo-svg-active-stroke-width', String(38 * strokeScale));
    const renderedBase = document.importNode(layoutTemplate.baseShape, true);
    renderedBase.setAttribute('class', 'cyo-svg-base');
    baseElement.replaceWith(renderedBase);

    sectionLayer.replaceChildren(...layoutTemplate.shapes.map((shape) => {
      const renderedShape = document.importNode(shape.element, true);
      renderedShape.setAttribute('id', shape.id);
      renderedShape.setAttribute('class', 'cyo-curve');
      return renderedShape;
    }));

    if (cyoLayoutName) {
      cyoLayoutName.textContent = `${cyoState.menuType} — ${cyoState.submenuName}`;
    }

    const activeIds = new Set(cyoState.sections.map((section) => section.id));
    const sambalSectionId = submenu.sambalSectionId;
    const imageLayer = cyoLayout?.querySelector('.cyo-svg-images');
    if (imageLayer) {
      imageLayer.innerHTML = '';
    }

    // Update target indicator badge
    const currentActiveSec = cyoState.sections.find((s) => s.id === cyoState.activeSection);
    if (cyoActiveSectionTarget) {
      cyoActiveSectionTarget.textContent = currentActiveSec ? `Mengisi: ${currentActiveSec.label}` : 'Pilih Bagian';
    }

    // Update tombol kosongkan section (tampil hanya bila section aktif terisi)
    if (cyoClearSectionBtn) {
      const isFilled = Boolean(currentActiveSec?.selection);
      cyoClearSectionBtn.disabled = !isFilled;
      cyoClearSectionBtn.classList.toggle('disabled', !isFilled);
      cyoClearSectionBtn.style.display = isFilled ? 'inline-flex' : 'none';
    }

    cyoLayout?.querySelectorAll('.cyo-curve').forEach((curve) => {
      const section = cyoState.sections.find((item) => item.id === curve.id);
      const isVisible = activeIds.has(curve.id);
      const isSambalSection = curve.id === sambalSectionId;
      curve.classList.toggle('active', cyoState.activeSection === curve.id || isSambalSection);
      curve.classList.toggle('sambal-locked', isSambalSection);
      curve.classList.toggle('filled', Boolean(section?.selection));
      curve.setAttribute('aria-label', isSambalSection
        ? `${section?.label || 'Section'} khusus untuk ${cyoState.pelengkap.sambal || 'sambal'}`
        : section?.label || curve.id);

      curve.onclick = () => {
        if (!isVisible || isSambalSection) return;

        // Single click on any other section → make it active
        cyoState.activeSection = curve.id;
        if (section?.selection?.category) {
          setCyoActiveCategory(section.selection.category);
        }
        renderCyoLayout();
        renderCyoOptions();
        openCyoIngredientPicker();
      };

      // Double click on a filled section → clear its food selection
      curve.ondblclick = () => {
        if (!isVisible || isSambalSection || !section?.selection) return;
        const removedName = section.selection.name;
        section.selection = null;
        // Activate the now-empty section so the user can re-fill it
        cyoState.activeSection = curve.id;
        renderCyoLayout();
        renderCyoOptions();
        updateCyoSummary();
        showToast(`${removedName} dibatalkan dari ${section.label}`);
      };

      if (!section) return;

      if (isSambalSection && imageLayer) {
        const sambalImage = getCyoSambalImage(cyoState.pelengkap.sambal);
        if (sambalImage) {
          const bounds = curve.getBBox();
          const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
          image.setAttribute('href', sambalImage);
          image.setAttribute('x', bounds.x);
          image.setAttribute('y', bounds.y);
          image.setAttribute('width', bounds.width);
          image.setAttribute('height', bounds.height);
          image.setAttribute('preserveAspectRatio', 'xMidYMid slice');
          image.setAttribute('clip-path', `url(#clip-${curve.id})`);
          image.classList.add('cyo-svg-food-image', 'cyo-svg-sambal-image');
          imageLayer.appendChild(image);
        }
        return;
      }

      if (section.selection && section.selection.img && imageLayer) {
        const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
        const bounds = curve.getBBox();
        image.setAttribute('href', section.selection.img);
        image.setAttribute('x', bounds.x);
        image.setAttribute('y', bounds.y);
        image.setAttribute('width', bounds.width);
        image.setAttribute('height', bounds.height);
        image.setAttribute('preserveAspectRatio', 'xMidYMid slice');
        image.setAttribute('clip-path', `url(#clip-${curve.id})`);
        image.classList.add('cyo-svg-food-image');
        imageLayer.appendChild(image);
      }
    });
  }

  function setCyoActiveCategory(category) {
    cyoState.activeCategory = category;
    document.querySelectorAll('.cyo-category-tab').forEach((button) => {
      const isActive = button.dataset.cyoCategory === category;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-selected', String(isActive));
    });
  }

  function openCyoIngredientPicker() {
    if (!window.matchMedia('(max-width: 600px)').matches || !cyoSection) return;
    if (cyoSection.classList.contains('ingredient-picker-open')) return;

    cyoPreviousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    cyoSection.classList.add('ingredient-picker-open');
    cyoPickerCloseBtn?.focus();
  }

  function closeCyoIngredientPicker() {
    if (!cyoSection?.classList.contains('ingredient-picker-open')) return;

    cyoSection.classList.remove('ingredient-picker-open');
    document.body.style.overflow = cyoPreviousBodyOverflow;
  }

  /*
   * Pilihan Makanan (Format Sweetgreen: Gambar Kotak & Nama Hidangan Saja)
   * Tetap tampil sejak awal walaupun user belum mengklik section layout.
   */
  function renderCyoOptions() {
    if (!cyoOptions) return;

    const currentSection = cyoState.sections.find((item) => item.id === cyoState.activeSection);
    const currentSubmenu = CYO_CONFIG[cyoState.menuType]?.submenus.find((item) => item.id === cyoState.submenuId);
    if (currentSection?.id === currentSubmenu?.sambalSectionId) {
      cyoOptions.textContent = 'Section ini khusus untuk sambal. Pilih section lain untuk memilih hidangan.';
      return;
    }
    const selectedDishId = currentSection?.selection?.dishId;
    const category = CYO_CATEGORY_BY_TAB[cyoState.activeCategory];
    const dishes = cyoDishes.filter((dish) =>
      normalizeCyoFieldName(dish.category) === normalizeCyoFieldName(category)
      && isCyoDishAvailableForCurrentBox(dish)
    );

    cyoOptions.replaceChildren();
    dishes.forEach((dish) => {
      const button = document.createElement('button');
      button.className = `cyo-food-option ${selectedDishId === dish.id ? 'selected' : ''}`;
      button.type = 'button';
      button.dataset.foodId = dish.id;
      button.setAttribute('aria-label', `Pilih ${dish.name}`);

      const imageWrap = document.createElement('div');
      imageWrap.className = 'cyo-food-option-img-wrap';
      const imageElement = document.createElement('img');
      imageElement.src = encodeURI(dish.image);
      imageElement.alt = dish.name;
      imageElement.loading = 'lazy';
      imageWrap.appendChild(imageElement);

      const name = document.createElement('span');
      name.textContent = dish.name;

      button.append(imageWrap, name);
      button.addEventListener('click', () => handleFoodSelection(dish.id));
      cyoOptions.appendChild(button);
    });

    if (!dishes.length) {
      cyoOptions.textContent = 'Belum ada pilihan hidangan untuk kategori dan jenis box ini.';
    }
  }

  function isCyoDishAvailableForCurrentBox(dish) {
    const menuData = CYO_CONFIG[cyoState.menuType];
    const submenu = menuData?.submenus.find((item) => item.id === cyoState.submenuId);
    if (!menuData || !submenu) return false;

    return dish.boxTypes.some((boxType) => {
      if (boxType === 'Semua Jenis Box') return true;
      if (boxType === 'Semua Sajian Ngariung') return cyoState.menuType === 'Sajian Ngariung';
      if (normalizeCyoFieldName(boxType) === normalizeCyoFieldName(submenu.name)) return true;
      return menuData.boxTypes.some(
        (menuBoxType) => normalizeCyoFieldName(menuBoxType) === normalizeCyoFieldName(boxType)
      );
    });
  }

  function getCyoComplementDishes(category) {
    const categoryPrefix = normalizeCyoFieldName(category);
    return cyoDishes.filter((dish) =>
      (categoryPrefix === 'pelengkap'
        ? normalizeCyoFieldName(dish.category) === categoryPrefix
        : normalizeCyoFieldName(dish.category).startsWith(categoryPrefix))
      && isCyoDishAvailableForCurrentBox(dish)
    );
  }

  function getCyoComplementOptionLabel(dish) {
    return dish.name;
  }

  function renderCyoPelengkapOptions() {
    if (!cyoSelectSambal || !cyoSelectBuah || !cyoPelengkapCheckboxes) return;

    const sambalDishes = getCyoComplementDishes('Pelengkap > Sambal');
    const fruitDishes = getCyoComplementDishes('Pelengkap > Buah');
    const extraDishes = getCyoComplementDishes('Pelengkap');

    const renderSelect = (select, emptyLabel, dishes, currentValue) => {
      select.replaceChildren(new Option(emptyLabel, ''));
      dishes.forEach((dish) => {
        select.add(new Option(getCyoComplementOptionLabel(dish), dish.name));
      });
      const availableValue = dishes.some((dish) => dish.name === currentValue)
        ? currentValue
        : '';
      select.value = availableValue;
      return availableValue;
    };

    cyoState.pelengkap.sambal = renderSelect(
      cyoSelectSambal,
      'Pilih sambal',
      sambalDishes,
      cyoState.pelengkap.sambal
    );
    cyoState.pelengkap.buah = renderSelect(
      cyoSelectBuah,
      'Pilih buah',
      fruitDishes,
      cyoState.pelengkap.buah
    );

    const previousExtras = cyoState.pelengkap.tambahan;
    const selectedExtras = extraDishes
      .filter((dish) => previousExtras.includes(dish.name))
      .map((dish) => dish.name);
    cyoPelengkapCheckboxes.replaceChildren();
    extraDishes.forEach((dish) => {
      const label = document.createElement('label');
      label.className = 'cyo-checkbox-item';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.name = 'pelengkap-tambahan';
      input.value = dish.name;
      input.checked = selectedExtras.includes(dish.name);
      const mark = document.createElement('span');
      mark.className = 'cyo-checkbox-mark';
      const text = document.createElement('span');
      text.className = 'cyo-checkbox-text';
      text.textContent = getCyoComplementOptionLabel(dish);
      label.append(input, mark, text);
      cyoPelengkapCheckboxes.appendChild(label);
    });
    cyoState.pelengkap.tambahan = selectedExtras;
    updateCyoPelengkapRecap();
  }

  /* Mengisi hidangan ke section aktif, atau unselect jika diklik kembali */
  function handleFoodSelection(dishId) {
    const dish = cyoDishes.find((item) => item.id === dishId);
    if (!dish) {
      console.error(`Dish racik menu tidak ditemukan: ${dishId}`);
      showToast('Hidangan tidak tersedia. Muat ulang halaman dan coba lagi.');
      return;
    }

    const foodName = dish.name;
    let section = cyoState.sections.find((item) => item.id === cyoState.activeSection);
    const submenu = CYO_CONFIG[cyoState.menuType]?.submenus.find((item) => item.id === cyoState.submenuId);
    if (section?.id === submenu?.sambalSectionId) {
      section = undefined;
    }
    if (!section) {
      section = cyoState.sections.find((item) => item.id !== submenu?.sambalSectionId && !item.selection);
      if (section) {
        cyoState.activeSection = section.id;
      }
    }

    if (section) {
      // Jika hidangan yang sama diklik lagi, unselect (kosongkan) section ini
      if (section.selection && section.selection.dishId === dish.id) {
        section.selection = null;
        renderCyoLayout();
        renderCyoOptions();
        updateCyoSummary();
        closeCyoIngredientPicker();
        showToast(`${foodName} dibatalkan dari ${section.label}`);
        return;
      }

      section.selection = {
        dishId: dish.id,
        name: foodName,
        img: encodeURI(dish.image),
        category: cyoState.activeCategory,
        hppPerPortion: dish.hppPerPortion
      };

      // Berpindah otomatis ke section kosong berikutnya untuk kemudahan meracik
      const currentIndex = cyoState.sections.findIndex((s) => s.id === section.id);
      const isAvailable = (s) => s.id !== submenu?.sambalSectionId && !s.selection;
      const nextEmptySection = cyoState.sections.find((s, index) => index > currentIndex && isAvailable(s))
        || cyoState.sections.find(isAvailable);
      if (nextEmptySection) {
        cyoState.activeSection = nextEmptySection.id;
      }
    }

    renderCyoLayout();
    renderCyoOptions();
    updateCyoSummary();
    closeCyoIngredientPicker();
  }

  /* Kosongkan section yang sedang aktif */
  function clearActiveSection() {
    const section = cyoState.sections.find((item) => item.id === cyoState.activeSection);
    const submenu = CYO_CONFIG[cyoState.menuType]?.submenus.find((item) => item.id === cyoState.submenuId);
    if (!section || section.id === submenu?.sambalSectionId || !section.selection) return;

    const clearedName = section.selection.name;
    section.selection = null;
    renderCyoLayout();
    renderCyoOptions();
    updateCyoSummary();
    showToast(`${section.label} (${clearedName}) dikosongkan`);
  }

  function resetCyoSections() {
    cyoState.sections.forEach((section) => {
      section.selection = null;
    });
    cyoState.activeSection = cyoState.sections.find((section) => (
      section.id !== CYO_CONFIG[cyoState.menuType]?.submenus
        .find((submenu) => submenu.id === cyoState.submenuId)?.sambalSectionId
    ))?.id || null;

    if (cyoSelectSambal) cyoSelectSambal.value = '';
    if (cyoSelectBuah) cyoSelectBuah.value = '';
    cyoPelengkapCheckboxes?.querySelectorAll('input[name="pelengkap-tambahan"]').forEach((checkbox) => {
      checkbox.checked = false;
    });
    cyoState.packaging = '';
    if (cyoPackagingSelect) cyoPackagingSelect.value = '';

    closeCyoIngredientPicker();
    renderCyoLayout();
    renderCyoOptions();
    updateCyoPelengkapRecap();
    showToast('Semua bagian dan pilihan pelengkap telah direset');
  }

  function updateCyoPelengkapRecap() {
    const sambalValue = cyoSelectSambal?.value ?? '';
    const buahValue = cyoSelectBuah?.value ?? '';
    const checkedTambahan = Array.from(
      cyoPelengkapCheckboxes?.querySelectorAll('input[name="pelengkap-tambahan"]:checked') || []
    ).map((checkbox) => checkbox.value);

    cyoState.pelengkap.sambal = sambalValue;
    cyoState.pelengkap.buah = buahValue;
    cyoState.pelengkap.tambahan = checkedTambahan;

    const recapParts = [
      sambalValue || 'Tanpa Sambal',
      buahValue || 'Tanpa Buah',
      checkedTambahan.length ? checkedTambahan.join(', ') : 'Tanpa Tambahan'
    ];
    if (cyoPelengkapRecapText) cyoPelengkapRecapText.textContent = recapParts.join(', ');
    if (cyoState.sections.length) renderCyoLayout();
    updateCyoSummary();
  }

  /* Pelengkap: pilihan dan harganya berasal dari data CYO. */
  function initPelengkapControls() {
    cyoSelectSambal?.addEventListener('change', updateCyoPelengkapRecap);
    cyoSelectBuah?.addEventListener('change', updateCyoPelengkapRecap);
    cyoPelengkapCheckboxes?.addEventListener('change', updateCyoPelengkapRecap);
    if (cyoPricingDataLoaded) updateCyoPelengkapRecap();
  }

  function getCyoSelectedComplementHpp(category, name) {
    if (!name || name.startsWith('Tanpa ')) return 0;
    const targetCategory = normalizeCyoFieldName(category);
    const dish = cyoDishes.find((item) =>
      (targetCategory === 'pelengkap'
        ? normalizeCyoFieldName(item.category) === targetCategory
        : normalizeCyoFieldName(item.category).startsWith(targetCategory))
      && normalizeCyoFieldName(item.name) === normalizeCyoFieldName(name)
      && isCyoDishAvailableForCurrentBox(item)
    );
    return dish?.hppPerPortion || 0;
  }

  function getCyoComplementUnitTotal() {
    return getCyoSelectedComplementHpp('Pelengkap > Sambal', cyoState.pelengkap.sambal)
      + getCyoSelectedComplementHpp('Pelengkap > Buah', cyoState.pelengkap.buah)
      + cyoState.pelengkap.tambahan.reduce(
        (total, name) => total + getCyoSelectedComplementHpp('Pelengkap', name),
        0
      );
  }

  function setCyoPortion(value) {
    const minimum = 10;
    const step = getCyoPortionStep();
    const requestedPortion = Number.isFinite(value) ? Math.floor(value) : minimum;
    cyoState.portion = requestedPortion < minimum
      ? minimum
      : minimum + Math.round((requestedPortion - minimum) / step) * step;
    if (cyoPortionInput) {
      cyoPortionInput.min = String(minimum);
      cyoPortionInput.step = String(step);
      cyoPortionInput.value = cyoState.portion;
      cyoPortionInput.setAttribute('aria-label', `Jumlah porsi, minimal ${minimum}${step > 1 ? ` dan kelipatan ${step}` : ''}`);
    }
    if (cyoPortionLabel) {
      cyoPortionLabel.textContent = `Porsi (minimal ${minimum}${step > 1 ? `, kelipatan ${step}` : ''})`;
    }
    updateCyoSummary();
  }

  function getCyoPortionStep() {
    return cyoState.menuType === 'Sajian Ngariung' ? 5 : 1;
  }

  function updateCyoPackagingControl() {
    const isNgariung = cyoState.menuType === 'Sajian Ngariung';
    if (cyoPackagingControl) cyoPackagingControl.hidden = !isNgariung;
    cyoOrderSummary?.classList.toggle('has-cyo-packaging', isNgariung);
  }

  function getCyoDishUnitTotal() {
    return cyoState.sections.reduce(
      (total, section) => total + (section.selection?.hppPerPortion || 0),
      0
    ) + getCyoComplementUnitTotal();
  }

  function getCyoPackagingUnitCost() {
    const submenu = CYO_CONFIG[cyoState.menuType]?.submenus.find((item) => item.id === cyoState.submenuId);
    return submenu ? cyoPackagingCosts[submenu.name] || 0 : 0;
  }

  function getCyoPricingBreakdown() {
    const submenu = CYO_CONFIG[cyoState.menuType]?.submenus.find((item) => item.id === cyoState.submenuId);
    const jenisBox = submenu ? submenu.name : '';
    const items = cyoState.sections.filter((section) => section.selection).map((section) => ({
      hppPerPortion: section.selection.hppPerPortion || 0,
      name: section.selection.name
    }));

    const selectedComplements = [
      { name: cyoState.pelengkap.sambal, category: 'Pelengkap > Sambal' },
      { name: cyoState.pelengkap.buah, category: 'Pelengkap > Buah' },
      ...cyoState.pelengkap.tambahan.map((name) => ({ name, category: 'Pelengkap' }))
    ].filter((item) => item.name && !item.name.startsWith('Tanpa '));

    const dishes = [
      ...items.map((item) => ({
        hppPerPortion: item.hppPerPortion,
        name: item.name
      })),
      ...selectedComplements.map((item) => ({
        hppPerPortion: getCyoSelectedComplementHpp(item.category, item.name),
        name: item.name,
        category: item.category
      }))
    ];

    const pricing = window.hitungHargaCyo
      ? window.hitungHargaCyo({
        dishes,
        jenisBox,
        jumlahPorsi: cyoState.portion,
        marginPercent: window.MARGIN_PERCENT_DEFAULT,
        packagingCosts: cyoPackagingCosts
      })
      : {
        hppHidangan: getCyoDishUnitTotal(),
        hppKemasan: getCyoPackagingUnitCost(),
        totalOperasional: 0,
        hargaHidangan: 0,
        biayaKemasanLayanan: getCyoPackagingUnitCost() + (window.KOMISI || 2000),
        hargaPerPorsi: 0,
        subtotalAkhir: 0
      };

    return {
      ...pricing,
      dishUnitTotal: pricing.hargaHidangan,
      packagingUnitCost: pricing.biayaKemasanLayanan,
      subtotal: pricing.subtotalAkhir
    };
  }

  function getCyoUnitTotal() {
    return getCyoPricingBreakdown().hargaPerPorsi;
  }

  function getCyoTotal() {
    return getCyoPricingBreakdown().subtotalAkhir;
  }

  function updateCyoSummary() {
    const breakdown = getCyoPricingBreakdown();
    if (cyoUnitPriceEl) {
      cyoUnitPriceEl.textContent = formatCurrency(breakdown.hargaHidangan);
    }
    if (cyoPackagingPriceEl) {
      cyoPackagingPriceEl.textContent = formatCurrency(breakdown.biayaKemasanLayanan);
    }
    if (cyoUnitTotalEl) {
      cyoUnitTotalEl.textContent = formatCurrency(breakdown.hargaPerPorsi);
    }
    if (cyoSubtotalEl) {
      cyoSubtotalEl.textContent = formatCurrency(breakdown.subtotalAkhir);
    }

    if (!cyoIngredientsList) return;

    const recapItems = cyoState.sections
      .filter((section) => section.selection)
      .map((section) => ({
        label: section.label.replace(/\s*\([^)]*\)$/, ''),
        name: section.selection.name
      }));

    const selectedComplements = [
      cyoState.pelengkap.sambal !== 'Tanpa Sambal' ? cyoState.pelengkap.sambal : null,
      cyoState.pelengkap.buah !== 'Tanpa Buah' ? cyoState.pelengkap.buah : null,
      ...cyoState.pelengkap.tambahan
    ].filter(Boolean);

    if (selectedComplements.length) {
      recapItems.push({ label: 'Pelengkap', name: selectedComplements.join(', ') });
    }
    if (cyoState.menuType === 'Sajian Ngariung' && cyoState.packaging) {
      recapItems.push({ label: 'Kemasan', name: cyoState.packaging });
    }

    cyoIngredientsList.replaceChildren();
    recapItems.forEach((item) => {
      const listItem = document.createElement('li');
      const label = document.createElement('span');
      const name = document.createElement('strong');
      listItem.className = 'cyo-ingredients-item';
      label.className = 'cyo-ingredients-label';
      label.textContent = item.label;
      name.textContent = item.name;
      listItem.append(label, name);
      cyoIngredientsList.appendChild(listItem);
    });

    const selectedFoodCount = cyoState.sections.filter((section) => section.selection).length;
    if (cyoRecapCount) {
      cyoRecapCount.textContent = selectedFoodCount
        ? `${selectedFoodCount} bagian terisi`
        : '0 bagian terisi';
    }
    if (cyoRecapEmpty) {
      cyoRecapEmpty.hidden = recapItems.length > 0;
    }
  }

  function addCyoToCart() {
    const selected = cyoState.sections.filter((section) => section.selection);
    if (!selected.length) {
      showToast('Pilih minimal satu hidangan sebelum menambahkan pesanan');
      return;
    }
    if (cyoState.menuType === 'Sajian Ngariung' && !cyoState.packaging) {
      showToast('Pilih kemasan untuk Sajian Ngariung');
      cyoPackagingSelect?.focus();
      return;
    }

    const breakdown = getCyoPricingBreakdown();
    const details = selected.map((section) => `${section.label}: ${section.selection.name}`);
    if (cyoState.menuType === 'Sajian Ngariung') {
      details.push(`Kemasan: ${cyoState.packaging}`);
    }

    // Tambahkan rekap 3 bagian pelengkap ke rincian pesanan
    const pelengkapParts = [];
    if (cyoState.pelengkap.sambal && cyoState.pelengkap.sambal !== 'Tanpa Sambal') {
      pelengkapParts.push(cyoState.pelengkap.sambal);
    } else {
      pelengkapParts.push('Tanpa Sambal');
    }

    if (cyoState.pelengkap.buah && cyoState.pelengkap.buah !== 'Tanpa Buah') {
      pelengkapParts.push(cyoState.pelengkap.buah);
    } else {
      pelengkapParts.push('Tanpa Buah');
    }

    if (cyoState.pelengkap.tambahan && cyoState.pelengkap.tambahan.length > 0) {
      pelengkapParts.push(cyoState.pelengkap.tambahan.join(', '));
    } else {
      pelengkapParts.push('Tanpa Tambahan');
    }

    details.push(`Pelengkap: ${pelengkapParts.join(', ')}`);

    const cartDateWasCleared = addToCart({
      id: ++cartIdCounter,
      type: 'cyo',
      name: `${cyoState.menuType} (${cyoState.submenuName}) Racik Sendiri`,
      price: breakdown.hargaPerPorsi,
      qty: cyoState.portion,
      minQty: 10,
      step: getCyoPortionStep(),
      details,
      compartments: null,
      priceBreakdown: {
        hppHidangan: breakdown.hppHidangan,
        hppKemasan: breakdown.hppKemasan,
        totalOperasional: breakdown.totalOperasional,
        hargaHidangan: breakdown.hargaHidangan,
        biayaKemasanLayanan: breakdown.biayaKemasanLayanan,
        hargaPerPorsi: breakdown.hargaPerPorsi,
        subtotalAkhir: breakdown.subtotalAkhir,
        dishUnitTotal: breakdown.hargaHidangan,
        packagingUnitCost: breakdown.biayaKemasanLayanan,
        subtotal: breakdown.subtotalAkhir
      }
    });

    if (cartDateWasCleared !== null && !cartDateWasCleared) {
      showToast(`${cyoState.portion} porsi ${cyoState.menuType} (${cyoState.submenuName}) ditambahkan ke pesanan`);
    }
  }

  /* =========================================================
     CART MANAGEMENT
     ========================================================= */
  function addToCart(item) {
    if ((item.pickupOnly && cart.length > 0) || cart.some((cartItem) => cartItem.pickupOnly)) {
      showToast('Berkah Box hanya bisa dipesan sendiri, tidak bisa digabung dengan menu lain. Kosongkan keranjang terlebih dahulu.');
      return null;
    }
    cart.push(item);
    return updateCartUI();
  }

  function enrichCartItemsFromProducts() {
    const products = [...document.querySelectorAll('.menu-card[data-name]')];
    cart.forEach((item) => {
      const product = (item.productId && products.find((card) => card.dataset.productId === item.productId))
        || products.find((card) => card.dataset.name === item.name);
      if (!product) return;

      if (product.dataset.productId) item.productId = product.dataset.productId;
      item.fridayOnly = product.dataset.fridayOnly === 'true';
      item.pickupOnly = product.dataset.pickupOnly === 'true';
      if (!item.description) {
        item.description = product.querySelector('.menu-card-desc')?.textContent.trim() || '';
      }
      if (!item.category && product.dataset.category) {
        item.category = product.dataset.subcategory
          ? `${product.dataset.category} - ${product.dataset.subcategory}`
          : product.dataset.category;
      }
    });
  }

  function initDeliveryDate() {
    const minimumDate = new Date();
    minimumDate.setHours(0, 0, 0, 0);
    minimumDate.setDate(minimumDate.getDate() + 3);

    const dateValue = formatLocalDate(minimumDate);
    deliveryDateNativeInput.min = dateValue;
    deliveryDateNativeInput.value = dateValue;
    deliveryDateInput.value = formatDisplayDate(dateValue);
    initDeliveryTimes();
    updateDeliveryDateDisplay();
    deliveryDateInput.addEventListener('input', updateDeliveryDateDisplay);
    deliveryDateInput.addEventListener('change', handleDeliveryDateChange);
    deliveryDateNativeInput.addEventListener('change', () => {
      deliveryDateInput.value = formatDisplayDate(deliveryDateNativeInput.value);
      handleDeliveryDateChange();
    });
    deliveryDateInput.addEventListener('click', () => {
      updateDeliveryDateConstraints();
      if (typeof deliveryDateNativeInput.showPicker === 'function') {
        deliveryDateNativeInput.showPicker();
      }
    });
    deliveryTimeSelect.addEventListener('change', updateDeliveryDateDisplay);
  }

  function initDeliveryTimes() {
    const [startHours, startMinutes] = DELIVERY_TIME_START.split(':').map(Number);
    const [endHours, endMinutes] = DELIVERY_TIME_END.split(':').map(Number);
    const start = startHours * 60 + startMinutes;
    const end = endHours * 60 + endMinutes;

    for (let minutes = start; minutes <= end; minutes += 30) {
      const hours = String(Math.floor(minutes / 60)).padStart(2, '0');
      const minutePart = String(minutes % 60).padStart(2, '0');
      const value = `${hours}.${minutePart}`;
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value;
      deliveryTimeSelect.appendChild(option);
    }
  }

  function formatLocalDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function formatDisplayDate(dateValue) {
    if (!dateValue) return '';
    const [year, month, day] = dateValue.split('-');
    return `${day}/${month}/${year}`;
  }

  function parseDisplayDate(dateValue) {
    const match = dateValue.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return '';
    const [, day, month, year] = match;
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    if (date.getFullYear() !== Number(year) || date.getMonth() !== Number(month) - 1 || date.getDate() !== Number(day)) return '';
    return `${year}-${month}-${day}`;
  }

  function formatDeliveryDate(dateValue) {
    if (!dateValue) return '';
    const [year, month, day] = dateValue.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }).format(date);
  }

  function updateDeliveryDateDisplay() {
    const isoDate = parseDisplayDate(deliveryDateInput.value);
    const isValid = isDeliveryDateValid(isoDate);
    deliveryDateInput.classList.toggle('invalid', Boolean(deliveryDateInput.value) && !isValid);
    deliveryDateInput.setAttribute('aria-invalid', String(Boolean(deliveryDateInput.value) && !isValid));

    deliveryDateDisplay.textContent = isValid
      ? `Dipilih: ${formatDeliveryDate(isoDate)}${!isPickupMode() && deliveryTimeSelect.value ? `, pukul ${deliveryTimeSelect.value} WIB` : ''}`
      : deliveryDateInput.value
        ? isPickupMode()
          ? 'Pilih hari Jumat sebelum batas pemesanan Kamis pukul 21.00 WIB'
          : 'Tanggal pengiriman minimal H+3 dari tanggal order'
        : isPickupMode()
          ? 'Pilih tanggal pengambilan'
          : 'Pilih tanggal pengiriman';
  }

  function isDeliveryDateValid(dateValue) {
    if (isPickupMode()) return isPickupDateOrderable(dateValue);
    return Boolean(dateValue)
      && dateValue >= deliveryDateNativeInput.min
      && (!hasFridayOnlyItem() || isFriday(dateValue));
  }

  function hasFridayOnlyItem() {
    return cart.some((item) => item.fridayOnly === true);
  }

  function isPickupMode() {
    return cart.some((item) => item.pickupOnly === true);
  }

  function isFriday(dateValue) {
    if (!dateValue) return false;
    const [year, month, day] = dateValue.split('-').map(Number);
    return new Date(year, month - 1, day).getDay() === 5;
  }

  function handleDeliveryDateChange() {
    updateDeliveryDateDisplay();
  }

  function clearDeliveryDate() {
    deliveryDateInput.value = '';
    deliveryDateNativeInput.value = '';
    updateDeliveryDateDisplay();
  }

  function updateDeliveryDateConstraints() {
    if (isPickupMode()) {
      deliveryDateNativeInput.min = getNextAvailablePickupFriday();
      deliveryDateNativeInput.step = '7';
      return;
    }

    const minimumDate = new Date();
    minimumDate.setHours(0, 0, 0, 0);
    minimumDate.setDate(minimumDate.getDate() + 3);
    const minimumDateValue = formatLocalDate(minimumDate);

    if (!hasFridayOnlyItem()) {
      deliveryDateNativeInput.min = minimumDateValue;
      deliveryDateNativeInput.step = '1';
      return;
    }

    const firstFriday = new Date(minimumDate);
    firstFriday.setDate(firstFriday.getDate() + ((5 - firstFriday.getDay() + 7) % 7));
    deliveryDateNativeInput.min = formatLocalDate(firstFriday);
    deliveryDateNativeInput.step = '7';
  }

  function getJakartaDateTimeParts() {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23'
    }).formatToParts(new Date());
    return Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  }

  function getPickupCutoffTimestamp(dateValue) {
    const [year, month, day] = dateValue.split('-').map(Number);
    const cutoffDate = new Date(Date.UTC(year, month - 1, day - PICKUP_ORDER_CUTOFF_DAYS_BEFORE));
    const [hours, minutes] = PICKUP_ORDER_CUTOFF_TIME.split(':').map(Number);
    return Date.UTC(
      cutoffDate.getUTCFullYear(),
      cutoffDate.getUTCMonth(),
      cutoffDate.getUTCDate(),
      hours - 7,
      minutes
    );
  }

  function isPickupDateOrderable(dateValue, now = Date.now()) {
    return Boolean(dateValue) && isFriday(dateValue) && now <= getPickupCutoffTimestamp(dateValue);
  }

  function getNextAvailablePickupFriday() {
    const jakartaNow = getJakartaDateTimeParts();
    const today = new Date(Number(jakartaNow.year), Number(jakartaNow.month) - 1, Number(jakartaNow.day));

    for (let offset = 0; offset <= 14; offset += 1) {
      const candidate = new Date(today);
      candidate.setDate(today.getDate() + offset);
      const dateValue = formatLocalDate(candidate);
      if (isFriday(dateValue) && isPickupDateOrderable(dateValue)) return dateValue;
    }

    throw new Error('Tidak dapat menentukan tanggal pickup Jumat berikutnya');
  }

  function updateCartModeUI() {
    const pickupMode = isPickupMode();
    deliveryDateLabel.textContent = pickupMode ? 'Tanggal pengambilan' : 'Tanggal pengiriman';
    deliveryScheduleGrid.classList.toggle('pickup-mode', pickupMode);
    deliveryTimeField.hidden = pickupMode;
    deliveryTimeSelect.required = !pickupMode;
    pickupDetails.hidden = !pickupMode;
    pickupTimeText.textContent = `Jam pengambilan: ${PICKUP_TIME_FIXED.replace(':', '.')} WIB (sebelum salat Jumat)`;
    pickupAddressText.textContent = `Lokasi pengambilan: ${PICKUP_ADDRESS}`;
    deliveryAddressField.hidden = pickupMode;
    customerAddressInput.required = !pickupMode;
  }

  function removeFromCart(id) {
    cart = cart.filter((item) => item.id !== id);
    updateCartUI();
  }

  function getCartTotal() {
    return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  }

  function updateCartUI() {
    enrichCartItemsFromProducts();
    updateCartModeUI();
    updateDeliveryDateConstraints();
    const selectedDate = parseDisplayDate(deliveryDateInput.value);
    const pickupDateClosed = isPickupMode() && selectedDate && isFriday(selectedDate)
      && !isPickupDateOrderable(selectedDate);
    const fridayDateWasCleared = (isPickupMode() && selectedDate && !isPickupDateOrderable(selectedDate))
      || (!isPickupMode() && hasFridayOnlyItem() && selectedDate && !isFriday(selectedDate));
    if (fridayDateWasCleared) {
      clearDeliveryDate();
      showToast(pickupDateClosed
        ? 'Pemesanan Berkah Box untuk tanggal ini sudah ditutup (batas Kamis pukul 21.00 WIB). Mohon pilih Jumat berikutnya.'
        : isPickupMode()
          ? 'Berkah Box hanya bisa diambil pada hari Jumat. Mohon pilih tanggal hari Jumat.'
          : 'Berkah Box hanya tersedia untuk pengiriman hari Jumat. Mohon pilih tanggal hari Jumat.');
    } else {
      updateDeliveryDateDisplay();
    }

    // Simpan perubahan keranjang ke localStorage
    saveCartToStorage();

    // Header cart count
    cartCountEl.textContent = cart.reduce((count, item) => count + item.qty, 0);

    // Total
    const total = getCartTotal();
    cartTotalEl.textContent = formatCurrency(total);
    cartDepositEl.hidden = isPickupMode();
    cartPaymentLabel.textContent = isPickupMode()
      ? 'Pembayaran: lunas di muka (tanpa DP)'
      : 'DP minimal 50% dari total:';
    if (!isPickupMode()) cartDepositEl.textContent = formatCurrency(Math.ceil(total * 0.5));

    // Items list
    if (cart.length === 0) {
      cartItemsEl.innerHTML = '';
      cartItemsEl.appendChild(emptyCartMsg);
      emptyCartMsg.style.display = 'block';
      orderWhatsappBtn.disabled = true;
      return Boolean(fridayDateWasCleared);
    }

    orderWhatsappBtn.disabled = false;
    emptyCartMsg.style.display = 'none';

    cartItemsEl.innerHTML = cart
      .map((item) => {
        const details = (item.details || []).filter((detail) => !detail.startsWith('Kategori:'));
        const descriptionHtml = item.description
          ? `<div class="cart-item-details">${escapeHtml(item.description)}</div>`
          : '';
        const detailsHtml = details.length
          ? `<div class="cart-item-details">${details.map(escapeHtml).join(' &middot; ')}</div>`
          : '';
        const priceBreakdownHtml = item.priceBreakdown
          ? `<div class="cart-item-pricing">
              <div><span>Harga hidangan / porsi</span><strong>${formatCurrency(item.priceBreakdown.hargaHidangan ?? item.priceBreakdown.dishUnitTotal ?? 0)}</strong></div>
              <div><span>Kemasan & layanan / porsi</span><strong>${formatCurrency(item.priceBreakdown.biayaKemasanLayanan ?? item.priceBreakdown.packagingUnitCost ?? 0)}</strong></div>
              <div class="cart-item-pricing-total"><span>Subtotal akhir (${item.qty} porsi)</span><strong>${formatCurrency(item.priceBreakdown.subtotalAkhir ?? item.price * item.qty)}</strong></div>
            </div>`
          : '';

        return `
          <div class="cart-item" data-cart-id="${item.id}">
            <div class="cart-item-top">
              <span class="cart-item-name">${escapeHtml(item.name)}</span>
              <span class="cart-item-price">${formatCurrency(item.price * item.qty)}</span>
            </div>
            ${descriptionHtml}
            <div class="cart-item-quantity-row">
              <span class="cart-item-quantity-label">Jumlah</span>
              <div class="cart-quantity-control">
                <button type="button" data-cart-quantity-action="decrease" data-cart-id="${item.id}" ${item.qty <= (item.minQty || 1) ? 'disabled' : ''} aria-label="Kurangi jumlah">&minus;</button>
                <input type="number" value="${item.qty}" min="${item.minQty || 1}" step="${item.step || 1}" data-cart-quantity-input data-cart-id="${item.id}" aria-label="Jumlah ${escapeHtml(item.name)}">
                <button type="button" data-cart-quantity-action="increase" data-cart-id="${item.id}" aria-label="Tambah jumlah">+</button>
              </div>
            </div>
            ${priceBreakdownHtml}
            ${detailsHtml}
              <button class="cart-item-remove" data-remove-id="${item.id}">Hapus</button>
          </div>
        `;
      })
      .join('');

    // Wire up remove buttons
    cartItemsEl.querySelectorAll('[data-remove-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.removeId, 10);
        removeFromCart(id);
      });
    });

    cartItemsEl.querySelectorAll('[data-cart-quantity-action]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const item = cart.find((cartItem) => cartItem.id === Number(btn.dataset.cartId));
        if (!item) return;

        const minimum = item.minQty || 1;
        const step = item.step || 1;
        item.qty = btn.dataset.cartQuantityAction === 'increase'
          ? item.qty + step
          : Math.max(minimum, item.qty - step);
        updateCartUI();
      });
    });

    cartItemsEl.querySelectorAll('[data-cart-quantity-input]').forEach((input) => {
      input.addEventListener('change', () => {
        const item = cart.find((cartItem) => cartItem.id === Number(input.dataset.cartId));
        if (!item) return;

        const minimum = item.minQty || 1;
        const step = item.step || 1;
        let requestedQuantity = parseInt(input.value, 10);
        if (!Number.isInteger(requestedQuantity) || requestedQuantity < minimum) {
          item.qty = minimum;
        } else {
          if (step > 1 && (requestedQuantity - minimum) % step !== 0) {
            requestedQuantity = minimum + Math.round((requestedQuantity - minimum) / step) * step;
          }
          item.qty = Math.max(minimum, requestedQuantity);
        }
        updateCartUI();
      });
    });

    return Boolean(fridayDateWasCleared);
  }

  /* =========================================================
     WHATSAPP CHECKOUT
     ========================================================= */
  function handleWhatsAppCheckout() {
    if (cart.length === 0) return;

    const customerName = customerNameInput.value.trim();
    const customerNotes = customerNotesInput.value.trim() || 'Tidak ada';
    const total = getCartTotal();
    const pickupMode = Boolean(cart[0].pickupOnly);
    const deposit = pickupMode ? null : Math.ceil(total * 0.5);

    if (!customerName) {
      customerNameInput.focus();
      showToast('Mohon isi nama pemesan');
      return;
    }

    if (cart.some((item) => item.pickupOnly) && cart.some((item) => !item.pickupOnly)) {
      showToast('Berkah Box hanya bisa dipesan sendiri, tidak bisa digabung dengan menu lain. Kosongkan keranjang terlebih dahulu.');
      return;
    }

    updateDeliveryDateConstraints();
    const deliveryDateIso = parseDisplayDate(deliveryDateInput.value);
    if (pickupMode && deliveryDateIso && isFriday(deliveryDateIso) && !isPickupDateOrderable(deliveryDateIso)) {
      clearDeliveryDate();
      deliveryDateInput.focus();
      showToast('Pemesanan Berkah Box untuk tanggal ini sudah ditutup (batas Kamis pukul 21.00 WIB). Mohon pilih Jumat berikutnya.');
      return;
    }
    if (pickupMode && (!deliveryDateIso || !isFriday(deliveryDateIso))) {
      deliveryDateInput.focus();
      showToast('Berkah Box hanya bisa diambil pada hari Jumat. Mohon pilih tanggal hari Jumat.');
      return;
    }
    if (!pickupMode && hasFridayOnlyItem() && deliveryDateIso && !isFriday(deliveryDateIso)) {
      clearDeliveryDate();
      showToast('Berkah Box hanya tersedia untuk pengiriman hari Jumat. Mohon pilih tanggal hari Jumat.');
      return;
    }
    if (!isDeliveryDateValid(deliveryDateIso)) {
      deliveryDateInput.focus();
      showToast(pickupMode
        ? 'Berkah Box hanya bisa diambil pada hari Jumat. Mohon pilih tanggal hari Jumat.'
        : 'Tanggal pengiriman paling awal adalah H+3 dari tanggal order');
      return;
    }

    const deliveryTime = pickupMode ? '' : deliveryTimeSelect.value;
    if (!pickupMode && !deliveryTime) {
      deliveryTimeSelect.focus();
      showToast('Mohon pilih jam pengiriman');
      return;
    }

    const customerAddress = pickupMode ? PICKUP_ADDRESS : customerAddressInput.value.trim();
    if (!pickupMode && !customerAddress) {
      customerAddressInput.focus();
      showToast('Mohon isi alamat pengantaran');
      return;
    }

    const messageLines = [];
    messageLines.push(pickupMode
      ? '\u{1F371} Halo Kak, saya mau order *Berkah Box* di *Dapur Ambu 13* ya. Berikut detail pesanan saya:'
      : '\u{1F371} Halo Kak, saya mau order di *Dapur Ambu 13* ya. Berikut detail pesanan saya:');
    messageLines.push('');
    messageLines.push('\u{1F464} *Pemesan*');
    messageLines.push(customerName);
    messageLines.push('');
    messageLines.push(pickupMode ? '\u{1F4C5} *Tanggal Pengambilan*' : '\u{1F4C5} *Tanggal Pengiriman*');
    messageLines.push(formatDeliveryDate(deliveryDateIso));
    messageLines.push('');
    if (pickupMode) {
      messageLines.push('\u{1F552} *Jam Pengambilan*');
      messageLines.push(`${PICKUP_TIME_FIXED.replace(':', '.')} WIB (sebelum salat Jumat)`);
      messageLines.push('');
      messageLines.push('\u{1F4CD} *Lokasi Pengambilan*');
    } else {
      messageLines.push('\u{1F4CD} *Alamat Pengantaran*');
    }
    messageLines.push(customerAddress);
    messageLines.push('');
    messageLines.push('\u{1F9FE} *Pesanan*');

    cart.forEach((item, index) => {
      if (index > 0) messageLines.push('');
      messageLines.push(`${index + 1}. ${item.name}`);
      if (item.category) messageLines.push(`   ${item.category}`);
      messageLines.push(`   ${item.qty} x ${formatCurrency(item.price)} = ${formatCurrency(item.price * item.qty)}`);

      if (pickupMode) {
        return;
      } else if (item.type === 'cyo' && item.priceBreakdown) {
        messageLines.push(`   Total harga hidangan per porsi: ${formatCurrency(item.priceBreakdown.hargaHidangan ?? item.priceBreakdown.dishUnitTotal ?? 0)}`);
        messageLines.push(`   Kemasan & layanan per porsi: ${formatCurrency(item.priceBreakdown.biayaKemasanLayanan ?? item.priceBreakdown.packagingUnitCost ?? 0)}`);
        messageLines.push(`   Subtotal akhir (${item.qty} porsi): ${formatCurrency(item.priceBreakdown.subtotalAkhir ?? item.price * item.qty)}`);
        (item.details || []).forEach((detail) => {
          messageLines.push(`   ${detail}`);
        });
      } else if (item.type === 'cyo' && item.compartments) {
        messageLines.push('   Bagian Bento:');
        const compartmentOrder = ['base', 'protein', 'veggie', 'topping', 'sauce'];
        let compartmentNum = 1;
        compartmentOrder.forEach((key) => {
          const val = item.compartments[key];
          if (val) {
            const label = LABELS[key] || key;
            messageLines.push(`   Bagian ${compartmentNum} (${label}): ${val.name}`);
            compartmentNum++;
          }
        });
      } else if (item.details && item.details.length) {
        item.details.filter((detail) => !detail.startsWith('Kategori:')).forEach((detail) => {
          messageLines.push(`   ${detail}`);
        });
      }
    });

    messageLines.push('');
    messageLines.push('\u{1F4DD} *Catatan*');
    messageLines.push(customerNotes);
    messageLines.push('');
    messageLines.push(`\u{1F4B0} *Total: ${formatCurrency(total)}*`);
    if (pickupMode) {
      messageLines.push('Pembayaran: *Lunas di muka (tanpa DP)*');
    } else {
      messageLines.push(`DP minimal 50%: *${formatCurrency(deposit)}*`);
    }
    messageLines.push('');
    messageLines.push(pickupMode
      ? 'Mohon dikonfirmasi ketersediaannya dan info pembayarannya ya Kak. Terima kasih \u{1F64F}'
      : 'Mohon dikonfirmasi ketersediaan dan jadwal pengantarannya ya Kak. Terima kasih \u{1F64F}');

    const message = messageLines.join('\n').replace(/[—–]/g, '-');
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`;

    sessionStorage.setItem(CART_CHECKOUT_PENDING_KEY, '1');
    const whatsappWindow = window.open(whatsappUrl, '_blank');
    if (!whatsappWindow) sessionStorage.removeItem(CART_CHECKOUT_PENDING_KEY);
  }

  /* =========================================================
     TOAST NOTIFICATION
     ========================================================= */
  let toastTimeout;
  function showToast(text) {
    let toast = document.querySelector('.toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = text;
    toast.classList.add('show');

    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 2400);
  }

  /* =========================================================
     HEADER SHADOW ON SCROLL (polish)
     ========================================================= */
  window.addEventListener('scroll', () => {
    if (window.scrollY > 10) {
      header.style.boxShadow = '0 2px 12px rgba(42,42,42,0.08)';
    } else {
      header.style.boxShadow = 'none';
    }
  });

})();