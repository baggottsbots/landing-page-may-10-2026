let allData = [];
  let activeCategory = '*';
  let activeQuery = '';

  const escape = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));

  const get = (row, ...keys) => {
    const lower = {};
    Object.keys(row).forEach(k => { lower[k.toLowerCase().replace(/[\s_]/g, '')] = row[k]; });
    for (const k of keys) {
      const norm = k.toLowerCase().replace(/[\s_]/g, '');
      if (lower[norm] != null && String(lower[norm]).trim() !== '') return lower[norm];
    }
    return '';
  };

  const formatPrice = (val) => {
    if (val === '' || val == null) return '';
    const num = Number(String(val).replace(/[^0-9.\-]/g, ''));
    if (isNaN(num)) return String(val);
    return num.toFixed(2);
  };

  const isInStock = (val) => {
    const s = String(val ?? '').trim().toLowerCase();
    return s === 'yes' || s === 'true' || s === '1' || s === 'in stock' || s === 'available';
  };

  const renderCard = (row, i) => {
    const name = get(row, 'name', 'product', 'title', 'item');
    const description = get(row, 'description', 'desc', 'details');
    const price = formatPrice(get(row, 'price', 'cost', 'amount'));
    const imageUrl = get(row, 'image url', 'image', 'imageurl', 'photo', 'img');
    const category = get(row, 'category', 'type', 'group');
    const sku = get(row, 'sku', 'id', 'code');
    const stockRaw = get(row, 'in stock', 'stock', 'available', 'instock');
    const inStock = stockRaw === '' ? true : isInStock(stockRaw);
    const checkoutUrl = get(row, 'external checkout url', 'checkout url', 'checkout', 'link', 'url', 'buy url');
    const buyText = get(row, 'buy now text', 'button text', 'cta') || 'Buy now';

    const initial = name ? name.charAt(0).toUpperCase() : '·';
    const safeImg = imageUrl ? escape(imageUrl) : '';
    const imageHTML = safeImg
      ? `<img src="${safeImg}" alt="${escape(name)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
         <div class="placeholder" style="display:none">${escape(initial)}</div>`
      : `<div class="placeholder">${escape(initial)}</div>`;

    const stockBadge = inStock
      ? `<div class="badge in-stock">● In stock</div>`
      : `<div class="badge out-stock">○ Sold out</div>`;

    const categoryTag = category ? `<div class="category-tag">${escape(category)}</div>` : '';
    const skuHTML = sku ? `<div class="sku">${escape(sku)}</div>` : '';

    let buyHTML = '';
    if (inStock) {
      if (checkoutUrl) {
        buyHTML = `<a class="buy-btn" href="${escape(checkoutUrl)}" target="_blank" rel="noopener">${escape(buyText)}</a>`;
      } else {
        buyHTML = `<button class="buy-btn" type="button">${escape(buyText)}</button>`;
      }
    } else {
      buyHTML = `<span class="buy-btn disabled">Unavailable</span>`;
    }

    const priceHTML = price !== ''
      ? `<div class="price"><span class="currency">$</span>${escape(price)}</div>`
      : `<div class="price" style="color:var(--ink-soft);font-size:14px;font-style:italic">Price on request</div>`;

    const delay = Math.min(i * 50, 700);

    return `
      <article class="card" style="animation-delay: ${delay}ms">
        <div class="card-image">
          ${imageHTML}
          ${stockBadge}
          ${categoryTag}
        </div>
        <div class="card-body">
          ${skuHTML}
          <h2 class="name">${escape(name) || 'Untitled'}</h2>
          ${description ? `<p class="description">${escape(description)}</p>` : '<div style="flex:1"></div>'}
          <div class="footer-row">
            ${priceHTML}
            ${buyHTML}
          </div>
        </div>
      </article>
    `;
  };

  const apply = () => {
    const el = document.getElementById('rows');
    let filtered = allData;

    if (activeCategory !== '*') {
      filtered = filtered.filter(row => {
        const cat = String(get(row, 'category', 'type', 'group')).toLowerCase();
        return cat === activeCategory.toLowerCase();
      });
    }

    if (activeQuery) {
      const q = activeQuery.toLowerCase();
      filtered = filtered.filter(row =>
        Object.values(row).some(v => String(v ?? '').toLowerCase().includes(q))
      );
    }

    if (!filtered.length) {
      el.innerHTML = '<div class="state">No items match those filters.</div>';
      document.getElementById('count').textContent = '0';
      return;
    }

    el.innerHTML = filtered.map((row, i) => renderCard(row, i)).join('');
    document.getElementById('count').textContent = filtered.length;
  };

  const buildCategoryChips = () => {
    const cats = new Set();
    allData.forEach(row => {
      const c = String(get(row, 'category', 'type', 'group')).trim();
      if (c) cats.add(c);
    });
    const filtersEl = document.getElementById('filters');
    [...cats].sort().forEach(cat => {
      const btn = document.createElement('button');
      btn.className = 'chip';
      btn.dataset.cat = cat;
      btn.textContent = cat;
      filtersEl.appendChild(btn);
    });

    filtersEl.addEventListener('click', e => {
      const btn = e.target.closest('.chip');
      if (!btn) return;
      filtersEl.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      activeCategory = btn.dataset.cat;
      apply();
    });
  };

  document.getElementById('search').addEventListener('input', e => {
    activeQuery = e.target.value.trim();
    apply();
  });

  const stamp = () => {
    const now = new Date();
    document.getElementById('timestamp').textContent =
      now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    document.getElementById('footer-meta').textContent =
      now.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
  };

  fetch('https://paymegpt.com/api/google-sheets/11u8KGGrV99Jh6ca9ayaBwxKevOHPz8QxwrcJcW0jqF8/data', {
    credentials: 'include'
  })
    .then(r => {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(({ headers, data }) => {
      const el = document.getElementById('rows');
      if (!data || !data.length) {
        el.innerHTML = '<div class="state">No items found.</div>';
        document.getElementById('count').textContent = '0';
        stamp();
        return;
      }
      allData = data;
      buildCategoryChips();
      apply();
      stamp();
    })
    .catch(err => {
      document.getElementById('rows').innerHTML =
        '<div class="error"><strong>Error loading menu:</strong> ' + escape(err.message) + '</div>';
      document.getElementById('count').textContent = '!';
      stamp();
    });