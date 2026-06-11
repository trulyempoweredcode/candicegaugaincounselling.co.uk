/* =============================================
   SHOP JS (Shop upgrade feature)
   Basket stored in localStorage, floating basket button + slide-in
   drawer (both injected here), Stripe-hosted checkout via the editor
   API. Loaded ONLY on shop pages via:
     <script src="js/shop.js" data-site-id="N" data-api-base="https://editmy.site"></script>
   Without that tag (e.g. the file shipping inertly to non-shop sites
   on a template update) this script does nothing.

   Prices carried here are DISPLAY-ONLY — the server re-prices every
   line from its database when the checkout session is created.
   ============================================= */

(function () {
  'use strict';

  var scriptTag = document.querySelector('script[data-site-id][src*="shop.js"]');
  if (!scriptTag) return;

  var SITE_ID = scriptTag.getAttribute('data-site-id');
  var API_BASE = (scriptTag.getAttribute('data-api-base') || 'https://editmy.site').replace(/\/$/, '');
  var STORE_KEY = 'emscart:' + window.location.hostname;
  var MAX_QTY = 50;

  /* -----------------------------------------
     CART STORAGE
     ----------------------------------------- */
  function loadCart() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return { v: 1, items: [] };
      var cart = JSON.parse(raw);
      if (!cart || cart.v !== 1 || !Array.isArray(cart.items)) return { v: 1, items: [] };
      return cart;
    } catch (e) {
      return { v: 1, items: [] };
    }
  }

  function saveCart(cart) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(cart));
    } catch (e) { /* storage full/blocked — basket just won't persist */ }
  }

  function lineKey(item) {
    return item.slug + '|' + JSON.stringify(item.options || {});
  }

  function cartCount(cart) {
    return cart.items.reduce(function (n, i) { return n + i.qty; }, 0);
  }

  function cartSubtotal(cart) {
    return cart.items.reduce(function (n, i) { return n + (i.display_price_pence || 0) * i.qty; }, 0);
  }

  function formatPence(p) {
    return '£' + (p / 100).toFixed(2);
  }

  /* Success page hook: payment done → empty the basket. */
  if (document.querySelector('[data-shop-clear-cart]')) {
    saveCart({ v: 1, items: [] });
  }

  /* -----------------------------------------
     FAB + DRAWER (injected)
     ----------------------------------------- */
  var BASKET_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>';

  var fab = document.createElement('button');
  fab.className = 'cart-fab cart-fab--hidden';
  fab.setAttribute('aria-label', 'Open basket');
  fab.innerHTML = BASKET_SVG + '<span class="cart-fab__count">0</span>';
  document.body.appendChild(fab);

  var overlay = document.createElement('div');
  overlay.className = 'cart-drawer__overlay';
  document.body.appendChild(overlay);

  var drawer = document.createElement('aside');
  drawer.className = 'cart-drawer';
  drawer.setAttribute('aria-label', 'Shopping basket');
  drawer.innerHTML =
    '<div class="cart-drawer__header">' +
      '<h2 class="cart-drawer__title">Your basket</h2>' +
      '<button class="cart-drawer__close" aria-label="Close basket">&times;</button>' +
    '</div>' +
    '<div class="cart-drawer__items"></div>' +
    '<div class="cart-drawer__footer">' +
      '<p class="cart-drawer__subtotal"><span>Subtotal</span><span class="cart-drawer__subtotal-amount"></span></p>' +
      '<p class="cart-drawer__note">Delivery is calculated at checkout.</p>' +
      '<p class="cart-drawer__error" hidden></p>' +
      '<button class="btn btn--primary cart-drawer__checkout">Checkout</button>' +
    '</div>';
  document.body.appendChild(drawer);

  var itemsEl = drawer.querySelector('.cart-drawer__items');
  var subtotalEl = drawer.querySelector('.cart-drawer__subtotal-amount');
  var errorEl = drawer.querySelector('.cart-drawer__error');
  var checkoutBtn = drawer.querySelector('.cart-drawer__checkout');
  var footerEl = drawer.querySelector('.cart-drawer__footer');

  function escapeHtml(s) {
    var div = document.createElement('div');
    div.textContent = String(s);
    return div.innerHTML;
  }

  function render() {
    var cart = loadCart();
    var count = cartCount(cart);

    fab.classList.toggle('cart-fab--hidden', count === 0);
    fab.querySelector('.cart-fab__count').textContent = String(count);

    if (count === 0) {
      itemsEl.innerHTML = '<p class="cart-drawer__empty">Your basket is empty.</p>';
      footerEl.style.display = 'none';
      return;
    }
    footerEl.style.display = '';

    var html = '';
    cart.items.forEach(function (item, idx) {
      var optParts = [];
      Object.keys(item.options || {}).forEach(function (k) {
        optParts.push(escapeHtml(k) + ': ' + escapeHtml(item.options[k]));
      });
      html +=
        '<div class="cart-drawer__item" data-idx="' + idx + '">' +
          '<span class="cart-drawer__item-name">' + escapeHtml(item.name) + '</span>' +
          '<span class="cart-drawer__item-price">' + formatPence((item.display_price_pence || 0) * item.qty) + '</span>' +
          (optParts.length ? '<span class="cart-drawer__item-options">' + optParts.join(' · ') + '</span>' : '') +
          '<span class="cart-drawer__item-controls">' +
            '<span class="qty-stepper">' +
              '<button class="qty-stepper__btn" type="button" data-cart-qty="-1" aria-label="Decrease quantity">&minus;</button>' +
              '<input class="qty-stepper__input" type="number" value="' + item.qty + '" min="1" max="' + MAX_QTY + '" aria-label="Quantity">' +
              '<button class="qty-stepper__btn" type="button" data-cart-qty="+1" aria-label="Increase quantity">+</button>' +
            '</span>' +
            '<button class="cart-drawer__item-remove" type="button">Remove</button>' +
          '</span>' +
        '</div>';
    });
    itemsEl.innerHTML = html;
    subtotalEl.textContent = formatPence(cartSubtotal(cart));
  }

  function openDrawer() {
    render();
    drawer.classList.add('cart-drawer--open');
    overlay.classList.add('cart-drawer__overlay--visible');
  }

  function closeDrawer() {
    drawer.classList.remove('cart-drawer--open');
    overlay.classList.remove('cart-drawer__overlay--visible');
    errorEl.hidden = true;
  }

  fab.addEventListener('click', openDrawer);
  overlay.addEventListener('click', closeDrawer);
  drawer.querySelector('.cart-drawer__close').addEventListener('click', closeDrawer);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && drawer.classList.contains('cart-drawer--open')) closeDrawer();
  });

  /* Drawer item controls (delegated) */
  itemsEl.addEventListener('click', function (e) {
    var row = e.target.closest('.cart-drawer__item');
    if (!row) return;
    var idx = parseInt(row.getAttribute('data-idx'), 10);
    var cart = loadCart();
    if (!cart.items[idx]) return;

    if (e.target.closest('.cart-drawer__item-remove')) {
      cart.items.splice(idx, 1);
      saveCart(cart);
      render();
      return;
    }
    var qtyBtn = e.target.closest('[data-cart-qty]');
    if (qtyBtn) {
      var delta = qtyBtn.getAttribute('data-cart-qty') === '+1' ? 1 : -1;
      cart.items[idx].qty = Math.min(MAX_QTY, Math.max(1, cart.items[idx].qty + delta));
      saveCart(cart);
      render();
    }
  });

  itemsEl.addEventListener('change', function (e) {
    if (!e.target.classList.contains('qty-stepper__input')) return;
    var row = e.target.closest('.cart-drawer__item');
    if (!row) return;
    var idx = parseInt(row.getAttribute('data-idx'), 10);
    var cart = loadCart();
    if (!cart.items[idx]) return;
    var v = parseInt(e.target.value, 10);
    cart.items[idx].qty = isNaN(v) ? 1 : Math.min(MAX_QTY, Math.max(1, v));
    saveCart(cart);
    render();
  });

  /* -----------------------------------------
     PRODUCT PAGE: qty stepper + add to basket
     ----------------------------------------- */
  var buyBox = document.querySelector('.product-buy');
  if (buyBox) {
    var qtyInput = buyBox.querySelector('.qty-stepper__input');
    buyBox.querySelectorAll('[data-qty]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var delta = btn.getAttribute('data-qty') === '+1' ? 1 : -1;
        var v = parseInt(qtyInput.value, 10);
        if (isNaN(v)) v = 1;
        qtyInput.value = String(Math.min(MAX_QTY, Math.max(1, v + delta)));
      });
    });

    var addBtn = buyBox.querySelector('.product-add');
    if (addBtn) {
      addBtn.addEventListener('click', function () {
        var qty = parseInt(qtyInput ? qtyInput.value : '1', 10);
        if (isNaN(qty)) qty = 1;
        qty = Math.min(MAX_QTY, Math.max(1, qty));

        var options = {};
        var displayPrice = parseInt(addBtn.getAttribute('data-price-pence'), 10) || 0;
        document.querySelectorAll('select[data-option-group]').forEach(function (sel) {
          options[sel.getAttribute('data-option-group')] = sel.value;
          var opt = sel.options[sel.selectedIndex];
          displayPrice += parseInt(opt.getAttribute('data-price-delta'), 10) || 0;
        });

        var item = {
          slug: addBtn.getAttribute('data-slug'),
          name: addBtn.getAttribute('data-name'),
          qty: qty,
          options: options,
          display_price_pence: displayPrice
        };

        var cart = loadCart();
        var existing = null;
        cart.items.forEach(function (i) {
          if (lineKey(i) === lineKey(item)) existing = i;
        });
        if (existing) {
          existing.qty = Math.min(MAX_QTY, existing.qty + qty);
        } else {
          cart.items.push(item);
        }
        saveCart(cart);
        openDrawer();
      });
    }
  }

  /* -----------------------------------------
     CHECKOUT → Stripe-hosted payment page
     ----------------------------------------- */
  checkoutBtn.addEventListener('click', function () {
    var cart = loadCart();
    if (!cart.items.length) return;

    checkoutBtn.disabled = true;
    var originalText = checkoutBtn.textContent;
    checkoutBtn.textContent = 'Preparing checkout…';
    errorEl.hidden = true;

    var payload = {
      items: cart.items.map(function (i) {
        return { slug: i.slug, qty: i.qty, options: i.options || {} };
      })
    };

    fetch(API_BASE + '/api/shop/checkout/' + SITE_ID, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (response) {
        return response.json().then(function (data) {
          return { status: response.status, data: data };
        });
      })
      .then(function (result) {
        var body = result.data || {};
        if (result.status === 200 && body.data && body.data.url) {
          window.location = body.data.url;
          return;
        }
        if (result.status === 422 && body.data && Array.isArray(body.data.invalid)) {
          // Stale lines (deleted/hidden/sold out) — prune and tell the buyer.
          var badSlugs = body.data.invalid.map(function (x) { return x.slug; });
          var fresh = loadCart();
          fresh.items = fresh.items.filter(function (i) { return badSlugs.indexOf(i.slug) === -1; });
          saveCart(fresh);
          render();
          showError(body.error || 'Some items were no longer available and have been removed from your basket.');
          return;
        }
        showError(body.error || 'Checkout is temporarily unavailable. Please try again.');
      })
      .catch(function () {
        showError('Could not reach the checkout. Please check your connection and try again.');
      })
      .then(function () {
        checkoutBtn.disabled = false;
        checkoutBtn.textContent = originalText;
      });

    function showError(msg) {
      errorEl.textContent = msg;
      errorEl.hidden = false;
    }
  });

  render();
})();
