(function(){
  const API_BASE = window.location.origin;

  const tg = window.Telegram?.WebApp ?? null;
  if (tg) { tg.expand(); tg.ready(); }

  const panels = document.querySelectorAll('.catalog-panel');
  const navLinks = Array.from(document.querySelectorAll('.nav-links a[href^="#"]'));
  const trackedSections = navLinks
    .map(link => document.querySelector(link.getAttribute('href')))
    .filter(Boolean);



  function storageGet(key){
    try{return localStorage.getItem(key)}catch(e){return null}
  }
  function storageSet(key,value){
    try{localStorage.setItem(key,value)}catch(e){}
  }

  function applyViewMode(toggle, view){
    const target = document.querySelector(toggle.dataset.viewTarget);
    if(!target) return;
    const mode = view === 'list' ? 'list' : 'grid';
    target.classList.toggle('list-view', mode === 'list');
    target.classList.toggle('grid-view', mode === 'grid');
    toggle.querySelectorAll('[data-view]').forEach(btn => {
      const active = btn.dataset.view === mode;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
    if(toggle.dataset.viewKey){
      storageSet('pik:view:' + toggle.dataset.viewKey, mode);
    }
  }

  document.querySelectorAll('.view-toggle[data-view-target]').forEach(toggle => {
    const saved = toggle.dataset.viewKey ? storageGet('pik:view:' + toggle.dataset.viewKey) : null;
    applyViewMode(toggle, saved === 'list' ? 'list' : 'grid');
    toggle.querySelectorAll('[data-view]').forEach(btn => {
      btn.addEventListener('click', () => applyViewMode(toggle, btn.dataset.view));
    });
  });

  function setActiveNav(sectionId){
    navLinks.forEach(link => {
      link.classList.toggle('active', link.getAttribute('href') === '#' + sectionId);
    });
  }

  function updateActiveNav(){
    if(!trackedSections.length) return;

    const marker = window.scrollY + window.innerHeight * 0.36;
    let current = trackedSections[0];

    trackedSections.forEach(section => {
      if(section.offsetTop <= marker){
        current = section;
      }
    });

    if(window.innerHeight + window.scrollY >= document.body.scrollHeight - 8){
      current = trackedSections[trackedSections.length - 1];
    }

    setActiveNav(current.id);
  }

  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      const targetId = link.getAttribute('href').slice(1);
      setActiveNav(targetId);
    });
  });

  window.addEventListener('scroll', updateActiveNav, {passive:true});
  window.addEventListener('resize', updateActiveNav);
  updateActiveNav();

  function applyFilter(panel){
    const activeTab = panel.querySelector('.catalog-tab.active');
    const filter = activeTab ? activeTab.dataset.filter : 'all';
    const search = panel.querySelector('.catalog-search');
    const query = search ? search.value.trim().toLowerCase() : '';
    let visible = 0;

    panel.querySelectorAll('.catalog-card').forEach(card => {
      const categoryOk = filter === 'all' || card.dataset.category === filter;
      const text = (card.dataset.name || card.textContent).toLowerCase();
      const searchOk = !query || text.includes(query);
      const show = categoryOk && searchOk;
      card.style.display = show ? '' : 'none';
      if(show) visible += 1;
    });

    panel.classList.toggle('no-results', visible === 0);
    const grid = panel.querySelector('.catalog-grid-full');
    if(grid) grid.style.display = visible === 0 ? 'none' : '';
  }

  document.querySelectorAll('[data-expand]').forEach(btn => {
    btn.addEventListener('click', () => {
      const panel = document.getElementById(btn.dataset.expand);
      if(!panel) return;
      const willOpen = panel.hasAttribute('hidden');
      panel.hidden = !willOpen;
      btn.setAttribute('aria-expanded', String(willOpen));
      btn.textContent = willOpen
        ? (panel.id === 'menu-full' ? 'СВЕРНУТЬ МЕНЮ' : panel.id === 'missions-full' ? 'СВЕРНУТЬ МИССИИ' : 'СВЕРНУТЬ СКЛАД')
        : (panel.id === 'menu-full' ? 'ОТКРЫТЬ ВСЁ МЕНЮ' : panel.id === 'missions-full' ? 'ОТКРЫТЬ ВСЕ МИССИИ' : 'ОТКРЫТЬ ВЕСЬ СКЛАД');
      if(willOpen){
        applyFilter(panel);
        setTimeout(() => panel.scrollIntoView({behavior:'smooth', block:'start'}), 80);
      }
    });
  });

  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      const panel = document.getElementById(btn.dataset.close);
      if(!panel) return;
      panel.hidden = true;
      const opener = document.querySelector('[data-expand="' + panel.id + '"]');
      if(opener){
        opener.setAttribute('aria-expanded', 'false');
        opener.textContent = panel.id === 'menu-full' ? 'ОТКРЫТЬ ВСЁ МЕНЮ' : panel.id === 'missions-full' ? 'ОТКРЫТЬ ВСЕ МИССИИ' : 'ОТКРЫТЬ ВЕСЬ СКЛАД';
        opener.scrollIntoView({behavior:'smooth', block:'center'});
      }
    });
  });

  panels.forEach(panel => {
    panel.querySelectorAll('.catalog-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        panel.querySelectorAll('.catalog-tab').forEach(item => item.classList.remove('active'));
        tab.classList.add('active');
        applyFilter(panel);
      });
    });
    const search = panel.querySelector('.catalog-search');
    if(search) search.addEventListener('input', () => applyFilter(panel));
  });

  const cartOverlay = document.getElementById('cartOverlay');
  const cartItemsRoot = document.getElementById('cartItems');
  const cartTotal = document.getElementById('cartTotal');
  const cartCountText = document.getElementById('cartCountText');
  const cartBadge = document.querySelector('.cart-badge');
  const cartToast = document.getElementById('cartToast');
  const cart = new Map();
  let toastTimer = null;

  function parsePrice(priceText){
    const text = (priceText || '').replace(/\s/g, '');
    const digits = text.match(/\d+/g);
    const numeric = digits ? parseInt(digits.join(''), 10) : 0;
    return {
      value: numeric,
      isFrom: /от/i.test(priceText || ''),
      isRequest: /запрос/i.test(priceText || '') || numeric === 0
    };
  }

  function formatRub(value){
    return value.toLocaleString('ru-RU') + ' ₽';
  }

  function getProductFromButton(btn){
    const card = btn.closest('.catalog-card,.product-card,.arsenal-card,.mission-card');
    if(!card){
      return {id:'custom-order',name:'Быстрый заказ',meta:'ORDER // CUSTOM',priceText:'по запросу',priceValue:0,isFrom:false,isRequest:true,img:''};
    }
    const name = card.querySelector('.catalog-card-name,.product-name,.arsenal-name,.mission-name,.mission-card-title')?.textContent.trim() || 'Позиция';
    const meta = card.querySelector('.catalog-card-meta,.arsenal-category,.mission-type,.mission-card-meta')?.textContent.trim() || 'PUSHKI I KOFE';
    const priceText = card.querySelector('.catalog-price,.product-price,.arsenal-price,.mission-price,.mission-card-price')?.textContent.trim() || 'по запросу';
    const img = card.querySelector('img')?.getAttribute('src') || '';
    const parsed = parsePrice(priceText);
    const normalizedId = (name + '|' + priceText).toLowerCase().replace(/\s+/g, '-').replace(/[^a-zа-яё0-9|.-]/gi, '');
    return {id:normalizedId,name,meta,priceText,priceValue:parsed.value,isFrom:parsed.isFrom,isRequest:parsed.isRequest,img};
  }

  function setCartOpen(isOpen){
    if(!cartOverlay) return;
    cartOverlay.classList.toggle('open', isOpen);
    cartOverlay.setAttribute('aria-hidden', String(!isOpen));
    document.body.classList.toggle('cart-open', isOpen);
    document.querySelectorAll('[data-open-cart]').forEach(btn => btn.setAttribute('aria-expanded', String(isOpen)));
  }

  function showToast(text){
    if(!cartToast) return;
    cartToast.textContent = text;
    cartToast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => cartToast.classList.remove('show'), 1100);
  }

  function renderCart(){
    if(!cartItemsRoot) return;
    const items = Array.from(cart.values());
    const count = Array.from(cart.values()).reduce((s, i) => s + i.qty, 0);
    const { total, hasFrom, hasRequest } = getCartTotals();

    if(cartBadge){
      cartBadge.textContent = String(count);
      cartBadge.style.display = count > 0 ? 'flex' : 'none';
    }
    if(cartCountText) cartCountText.textContent = count + (count === 1 ? ' ITEM' : ' ITEMS');

    if(!items.length){
      cartItemsRoot.innerHTML = '<div class="cart-empty"><strong>ПУСТО</strong>Добавь кофе, миссию или экипировку — заказ появится здесь.</div>';
      if(cartTotal) cartTotal.textContent = '0 ₽';
      return;
    }

    cartItemsRoot.innerHTML = items.map(item => `
      <article class="cart-item" data-cart-id="${item.id}">
        <div class="cart-item-img">${item.img ? `<img src="${item.img}" alt="${item.name}">` : ''}</div>
        <div class="cart-item-main">
          <div class="cart-item-top">
            <div>
              <div class="cart-item-name">${item.name}</div>
              <div class="cart-item-meta">${item.meta}</div>
            </div>
            <div class="cart-item-price">${item.priceText}</div>
          </div>
          <div class="cart-item-actions">
            <div class="qty-control" aria-label="Количество">
              <button class="qty-btn" type="button" data-cart-dec="${item.id}">−</button>
              <span class="qty-value">${item.qty}</span>
              <button class="qty-btn" type="button" data-cart-inc="${item.id}">+</button>
            </div>
            <button class="cart-remove" type="button" data-cart-remove="${item.id}">УДАЛИТЬ</button>
          </div>
        </div>
      </article>
    `).join('');

    if(cartTotal){
      if(hasRequest && total === 0){
        cartTotal.textContent = 'по запросу';
      }else{
        cartTotal.textContent = (hasFrom ? 'от ' : '') + formatRub(total) + (hasRequest ? ' + уточнение' : '');
      }
    }
  }

  function addToCart(product){
    const current = cart.get(product.id);
    if(current){
      current.qty += 1;
    }else{
      cart.set(product.id, {...product, qty:1});
    }
    renderCart();
    showToast('ДОБАВЛЕНО: ' + product.name.toUpperCase());
  }

  document.querySelectorAll('[data-open-cart]').forEach(btn => {
    btn.addEventListener('click', () => setCartOpen(true));
  });

  document.querySelectorAll('[data-close-cart]').forEach(btn => {
    btn.addEventListener('click', () => setCartOpen(false));
  });

  document.addEventListener('keydown', (event) => {
    if(event.key === 'Escape') setCartOpen(false);
  });

  document.querySelector('[data-clear-cart]')?.addEventListener('click', () => {
    cart.clear();
    renderCart();
  });

  cartItemsRoot?.addEventListener('click', (event) => {
    const inc = event.target.closest('[data-cart-inc]');
    const dec = event.target.closest('[data-cart-dec]');
    const remove = event.target.closest('[data-cart-remove]');
    if(inc){
      const item = cart.get(inc.dataset.cartInc);
      if(item) item.qty += 1;
    }
    if(dec){
      const item = cart.get(dec.dataset.cartDec);
      if(item){
        item.qty -= 1;
        if(item.qty <= 0) cart.delete(dec.dataset.cartDec);
      }
    }
    if(remove){
      cart.delete(remove.dataset.cartRemove);
    }
    if(inc || dec || remove) renderCart();
  });

  document.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-add-cart]');
    if(!btn) return;
    event.stopPropagation();
    const product = getProductFromButton(btn);
    addToCart(product);
    const oldHTML = btn.innerHTML;
    btn.textContent = 'ДОБАВЛЕНО';
    setTimeout(() => { btn.innerHTML = oldHTML; }, 900);
  });

  /* ── ORDER MODAL ──────────────────────────────── */
  const orderModal    = document.getElementById('orderModal');
  const orderModalClose = document.getElementById('orderModalClose');
  const orderSubmit   = document.getElementById('orderSubmit');
  const orderName     = document.getElementById('orderName');
  const orderComment  = document.getElementById('orderComment');
  const orderError    = document.getElementById('orderError');
  const orderSummaryCount = document.getElementById('orderSummaryCount');
  const orderSummaryTotal = document.getElementById('orderSummaryTotal');

  const thankyouOverlay = document.getElementById('thankyouOverlay');
  const thankyouBack    = document.getElementById('thankyouBack');
  const thankyouBarFill = document.getElementById('thankyouBarFill');

  function setOrderModalOpen(isOpen){
    if(!orderModal) return;
    orderModal.classList.toggle('open', isOpen);
    orderModal.setAttribute('aria-hidden', String(!isOpen));
    document.body.classList.toggle('modal-open', isOpen);
    if(isOpen){
      // sync summary with current cart
      const count = getCartCount();
      const { total, hasFrom, hasRequest } = getCartTotals();
      if(orderSummaryCount) orderSummaryCount.textContent = String(count);
      if(orderSummaryTotal){
        if(hasRequest && total === 0){
          orderSummaryTotal.textContent = 'по запросу';
        } else {
          orderSummaryTotal.textContent = (hasFrom ? 'от ' : '') + formatRub(total) + (hasRequest ? ' + уточнение' : '');
        }
      }
      // clear previous state
      if(orderError){ orderError.textContent = ''; orderError.classList.remove('visible'); }
      if(orderName) orderName.value = tg?.initDataUnsafe?.user?.first_name ?? '';
      if(orderComment) orderComment.value = '';
      setTimeout(() => orderName && orderName.focus(), 80);
    }
  }

  function showThankyou(){
    if(!thankyouOverlay) return;
    thankyouOverlay.classList.add('open');
    thankyouOverlay.setAttribute('aria-hidden', 'false');
    // animate progress bar → auto-close after 4s
    if(thankyouBarFill){
      thankyouBarFill.style.width = '0%';
      requestAnimationFrame(() => {
        requestAnimationFrame(() => { thankyouBarFill.style.width = '100%'; });
      });
    }
  }

  function hideThankyou(){
    if(!thankyouOverlay) return;
    thankyouOverlay.classList.remove('open');
    thankyouOverlay.setAttribute('aria-hidden', 'true');
    if(thankyouBarFill) thankyouBarFill.style.width = '0%';
  }

  function showOrderError(msg){
    if(!orderError) return;
    orderError.textContent = msg;
    orderError.classList.add('visible');
  }

  // open modal from checkout button
  document.querySelector('.cart-checkout')?.addEventListener('click', () => {
    if(!cart.size){
      showToast('КОРЗИНА ПУСТА');
      return;
    }
    setCartOpen(false);
    setTimeout(() => setOrderModalOpen(true), 180);
  });

  orderModalClose?.addEventListener('click', () => setOrderModalOpen(false));

  orderModal?.addEventListener('click', (e) => {
    if(e.target === orderModal) setOrderModalOpen(false);
  });

  document.addEventListener('keydown', (e) => {
    if(e.key === 'Escape'){
      setOrderModalOpen(false);
      hideThankyou();
    }
  });

  thankyouBack?.addEventListener('click', () => {
    hideThankyou();
    cart.clear();
    renderCart();
  });

  orderSubmit?.addEventListener('click', async () => {
    if(!orderName || !orderName.value.trim()){
      showOrderError('УКАЖИТЕ ИМЯ ИЛИ ПОЗЫВНОЙ');
      orderName && orderName.focus();
      return;
    }

    if(orderError){ orderError.textContent = ''; orderError.classList.remove('visible'); }
    orderSubmit.disabled = true;
    orderSubmit.classList.add('loading');

    const { total } = getCartTotals();

    const payload = {
      customer_name: orderName.value.trim(),
      comment: orderComment ? orderComment.value.trim() : '',
      items: Object.fromEntries(Array.from(cart.values()).map(item => [item.name, item.qty])),
      total
    };

    try {
      const res = await fetch(`${API_BASE}/orders/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if(!res.ok){
        let errMsg = 'ОШИБКА СЕРВЕРА: ' + res.status;
        try { const data = await res.json(); if(data && data.detail) errMsg = data.detail; } catch(_){}
        throw new Error(errMsg);
      }

      // success
      setOrderModalOpen(false);
      const callsign = orderName ? orderName.value.trim() : '';
      setTimeout(() => {
        showThankyou();
        updateLoyaltyUI(callsign);
        if (tg) setTimeout(() => tg.close(), 4000);
      }, 200);

    } catch(err){
      const msg = err.message && err.message !== 'Failed to fetch'
        ? err.message.toUpperCase()
        : 'НЕТ СВЯЗИ С СЕРВЕРОМ. ПОПРОБУЙТЕ ЕЩЁ РАЗ.';
      showOrderError(msg);
    } finally {
      orderSubmit.disabled = false;
      orderSubmit.classList.remove('loading');
    }
  });

  // ── LOYALTY BLOCK ─────────────────────────────
  const loyaltyBlock = document.getElementById('loyaltyBlock');
  const loyaltySkip  = document.getElementById('loyaltySkip');

  function updateLoyaltyUI(){
    if(!loyaltyBlock) return;
    // показываем каждый раз — пусть клиент видит предложение после каждого заказа
    loyaltyBlock.style.display = '';
  }

  loyaltySkip?.addEventListener('click', () => {
    if(loyaltyBlock) loyaltyBlock.style.display = 'none';
  });

  async function loadMenu(){
    try{
      const res = await fetch(`${API_BASE}/menu/`);
      if(!res.ok) return;
      const data = await res.json();
      renderMenuCards(data.items || []);
    }catch(_){}
  }

  function renderMenuCards(items){
    const previewGrid = document.getElementById('menu-preview-grid');
    const fullGrid    = document.getElementById('menu-full-grid');
    document.querySelectorAll('.menu-loader').forEach(el => el.remove());

    const available = items.filter(item => {
      const av = item.available;
      return av === true || av === 'TRUE' || av === 'true' || av === 1 || av === '1';
    });

    const catIcon = {coffee:'☕', food:'🍕', cold:'🧊', combo:'🎯'};

    function fullCard(item){
      const cat   = (item.category || '').toLowerCase();
      const icon  = catIcon[cat] || '🛒';
      const price = item.price ? item.price + ' ₽' : 'по запросу';
      return `<article class="catalog-card" data-category="${cat}" data-name="${(item.name||'').toLowerCase()}">
        <div class="catalog-card-img">${item.image?`<img src="${item.image}" alt="${item.name||''}" loading="lazy">`:`<span class="catalog-card-icon">${icon}</span>`}<span class="catalog-badge">${cat.toUpperCase()}</span></div>
        <div class="catalog-card-body">
          <div class="catalog-card-meta">${cat.toUpperCase()} // MENU</div>
          <div class="catalog-card-name">${item.name||''}</div>
          <p class="catalog-card-desc">${item.description||''}</p>
          <div class="catalog-card-footer"><span class="catalog-price">${price}</span><button class="catalog-add" data-add-cart>В КОРЗИНУ</button></div>
        </div>
      </article>`;
    }

    function previewCard(item){
      const cat   = (item.category || '').toLowerCase();
      const icon  = catIcon[cat] || '🛒';
      const price = item.price ? item.price + ' ₽' : 'по запросу';
      return `<div class="product-card">
        <div class="product-img">${item.image?`<img src="${item.image}" alt="${item.name||''}" loading="lazy">`:`<span class="catalog-card-icon">${icon}</span>`}</div>
        <div class="product-body">
          <div class="product-name">${item.name||''}</div>
          <div class="product-desc">${item.description||''}</div>
          <div class="product-footer">
            <span class="product-price">${price}</span>
            <button class="add-btn" data-add-cart>
              <svg viewBox="0 0 24 24"><path d="M19 11H13V5H11V11H5V13H11V19H13V13H19V11Z"/></svg>
              В КОРЗИНУ
            </button>
          </div>
        </div>
      </div>`;
    }

    if(fullGrid)    fullGrid.innerHTML    = available.map(fullCard).join('');
    if(previewGrid) previewGrid.innerHTML = available.slice(0,4).map(previewCard).join('');
  }

  loadMenu();
  renderCart();
  updateLoyaltyUI();
  function getCartCount(){
    return Array.from(cart.values()).reduce((s, i) => s + i.qty, 0);
  }
  function getCartTotals(){
    let total = 0; let hasFrom = false; let hasRequest = false;
    cart.forEach(item => {
      total += item.priceValue * item.qty;
      if(item.isFrom) hasFrom = true;
      if(item.isRequest) hasRequest = true;
    });
    return { total, hasFrom, hasRequest };
  }
})();
