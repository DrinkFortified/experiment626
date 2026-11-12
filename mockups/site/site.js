/* Fortified site mockup: shared chrome, cart receipt, checkout and page behaviour. */
(function () {
  "use strict";

  // ---------- Product truth (mirrors PRODUCT.md) ----------
  var PRICE = 59, DISC = 0.10;
  // Subscribe tiers: 1 pack 10% off, 2 packs 15% off, 3+ packs 20% off + Free Creatine For Life. One-time is full price.
  function rate(n, plan) { if (plan !== "sub" || n < 1) return 0; return n >= 3 ? 0.20 : n === 2 ? 0.15 : 0.10; }
  function pct(n) { return Math.round(rate(n, "sub") * 100) + "%"; }
  var CDN = "https://cdn.shopify.com/s/files/1/1000/1973/2784/files/";
  var IMG = {
    "energy|watermelon": CDN + "260401-FOR-ENG-30-WTM-2026_1-Front_6bc5f01a-9136-4e66-89a5-64266588d385.webp?v=1791496978&width=600",
    "energy|orange": CDN + "260401-FOR-ENG-30-ORG-2026_1-Front_053d37d2-3c4d-4b3c-acc6-d67e95d50eb5.webp?v=1791496996&width=600",
    "everyday|watermelon": CDN + "260401-FOR-EDY-30-WTM-2026_1-Front_42bbc235-1ed3-45e8-b2c0-3ea3bf5b7e6e.webp?v=1791497044&width=600",
    "everyday|orange": CDN + "260401-FOR-EDY-30-ORG-2026_1-Front_d4d55d4a-fd92-4d2a-a06e-d6d64ebbe0e5.webp?v=1791497033&width=600"
  };
  var FORMULA = {
    energy: { name: "Energy", badge: "Caffeine", color: "#c8102e", ink: "#fff",
      line: "150mg natural caffeine from coffee bean, plus electrolytes.",
      adds: [["Natural Caffeine", "coffee bean, 150mg"]], base: "Higher-sodium formula" },
    everyday: { name: "Everyday", badge: "Caffeine-Free", color: "#f26a1b", ink: "#0e1a24",
      line: "Caffeine-free electrolytes with Vitamin D3 and K2.",
      adds: [["Vitamin D3", "cholecalciferol"], ["Vitamin K2", "as MK-7"]], base: "Daily formula" }
  };
  var FLAVOR = { watermelon: "Organic Salty Watermelon", orange: "Organic Salty Orange" };
  var BASE = [
    ["Pink Himalayan Salt", "as Ancient Ocean"],
    ["Magnesium Malate", "magnesium"],
    ["Coconut Water Powder", "as CocOganic Plus"],
    ["Potassium Chloride", "potassium"],
    ["Bamboo Fiber", "fiber"],
    ["Organic Lemon Juice Powder", "flavor"],
    ["Monk Fruit + Reb M", "as OnoSweet"]
  ];
  var VOID = ["Proprietary blends", "Hidden fillers", "Fear-mongering marketing"];

  var ICON = {
    bag: '<path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    check: '<path d="M4.5 12.5l5 5 10-11"/>',
    arrow: '<path d="M4 12h15M13 6l6 6-6 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    lock: '<rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
    truck: '<path d="M3 6h11v10H3zM14 9h4l3 3v4h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.6-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.6 4.5L20 16M20 20v-4h-4"/>',
    shield: '<path d="M12 3l7 3v6c0 4.5-3 7.8-7 9-4-1.2-7-4.5-7-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
    leaf: '<path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14M5 19l7-7"/>'
  };
  function icon(n, cls) { return '<svg class="' + (cls || "") + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICON[n] + "</svg>"; }
  function money(v) { return "$" + v.toFixed(2); }
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  // Drawn pack used when product photos cannot load (offline or blocked CDN).
  function packSvg(f, v) {
    var c = FORMULA[f].color, ink = FORMULA[f].ink, fl = v === "orange" ? "#f59a2b" : "#e8516b";
    return '<svg viewBox="0 0 200 200" role="img" aria-label="' + esc(FORMULA[f].name + " " + FLAVOR[v]) + ' pack">' +
      '<path d="M52 26h96l8 14v134a8 8 0 0 1-8 8H52a8 8 0 0 1-8-8V40z" fill="' + c + '" stroke="rgba(255,255,255,.85)" stroke-width="4" stroke-linejoin="round"/><path d="M52 26h96l8 14H44z" fill="rgba(0,0,0,.18)"/>' +
      '<text x="100" y="74" text-anchor="middle" font-family="Figtree,sans-serif" font-weight="900" font-size="13" letter-spacing="2.5" fill="' + ink + '">FORTIFIED</text>' +
      '<circle cx="100" cy="112" r="24" fill="' + fl + '" stroke="' + ink + '" stroke-width="3"/>' +
      '<text x="100" y="160" text-anchor="middle" font-family="Figtree,sans-serif" font-weight="900" font-size="15" fill="' + ink + '">' + FORMULA[f].name.toUpperCase() + "</text></svg>";
  }
  function packImg(f, v, eager) {
    return '<img src="' + IMG[f + "|" + v] + '" alt="' + esc(FORMULA[f].name + " " + FLAVOR[v] + " 30 Day Supply Pack") + '"' + (eager ? ' fetchpriority="high"' : ' loading="lazy"') + ' decoding="async" data-f="' + f + '" data-v="' + v + '">';
  }
  document.addEventListener("error", function (e) {
    var t = e.target;
    if (t && t.tagName === "IMG" && t.dataset && t.dataset.f) t.outerHTML = packSvg(t.dataset.f, t.dataset.v);
  }, true);
  function hydratePacks(root) {
    $$("[data-pack]", root).forEach(function (el) {
      var p = el.getAttribute("data-pack").split("|");
      el.innerHTML = packImg(p[0], p[1], el.hasAttribute("data-eager"));
    });
  }

  // ---------- Storage (per-viewer convenience only) ----------
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };

  // ---------- Cart ----------
  var cart = store.get("ff-cart", { lines: [], plan: "sub", days: 30 });
  if (!cart.lines) cart = { lines: [], plan: "sub", days: 30 };
  function count() { return cart.lines.reduce(function (a, l) { return a + l.qty; }, 0); }
  function totals() {
    var n = count(), sub = n * PRICE, r = rate(n, cart.plan), save = sub * r;
    return { n: n, sub: sub, save: save, r: r, total: sub - save, freeShip: n >= 2, creatine: n >= 3 && cart.plan === "sub" };
  }
  function save() { store.set("ff-cart", cart); }
  function add(f, v, qty, opts) {
    qty = qty || 1;
    var l = cart.lines.filter(function (x) { return x.f === f && x.v === v; })[0];
    if (l) l.qty += qty; else cart.lines.push({ f: f, v: v, qty: qty });
    if (opts && opts.plan) cart.plan = opts.plan;
    if (opts && opts.days) cart.days = opts.days;
    save(); renderCart(f + "|" + v); bumpCount();
  }
  function setQty(key, q) {
    cart.lines = cart.lines.map(function (l) { if (l.f + "|" + l.v === key) l.qty = q; return l; }).filter(function (l) { return l.qty > 0; });
    save(); renderCart(); bumpCount();
  }
  function replaceCart(lines, plan, days) { cart = { lines: lines, plan: plan, days: days }; save(); renderCart(); bumpCount(); }

  // ---------- Chrome ----------
  var page = document.documentElement.getAttribute("data-page") || "";
  var NAV = [["shop.html", "Build a box", "shop"], ["product.html?f=energy", "Energy", "energy"], ["product.html?f=everyday", "Everyday", "everyday"], ["ingredients.html", "Ingredients", "ingredients"], ["about.html", "About", "about"], ["help.html", "Help", "help"]];
  function navLinks() {
    return NAV.map(function (n) { return '<a href="' + n[0] + '"' + (page === n[2] ? ' aria-current="page"' : "") + ">" + n[1] + "</a>"; }).join("");
  }
  var head = $("[data-head]");
  if (head) {
    head.outerHTML =
      '<header class="site-top"><div class="bar">Subscribe and save up to 20%<span class="bar__long"> <b>+</b> Free Creatine at 3 packs</span></div>' +
      '<div class="site-head"><div class="wrap">' +
      '<button class="menu-btn" type="button" aria-label="Menu" aria-expanded="false" data-menu><span></span><span></span><span></span></button>' +
      '<a class="logo" href="index.html" aria-label="Fortified home">FORTIFIED<i>.</i></a>' +
      '<nav class="nav" aria-label="Main">' + navLinks() + "</nav>" +
      '<div class="head-actions"><button class="cart-btn" type="button" data-open-cart aria-label="Open box">' + icon("bag") + '<span class="cart-label">Box</span><span class="cart-count num" data-count>0</span></button></div>' +
      "</div></div></header>" +
      '<nav class="mnav" aria-label="Mobile">' + navLinks() + '<a href="performance.html">Performance</a></nav>';
  }
  var foot = $("[data-foot]");
  if (foot) {
    foot.outerHTML =
      '<footer class="foot"><div class="wrap"><div class="foot__grid">' +
      '<div><a class="logo" href="index.html">FORTIFIED<i>.</i></a><p style="max-width:36ch;margin:14px 0 0">Clean electrolytes for people who read the label. Hydration. No Mumbo Jumbo.</p>' +
      '<form class="news" data-news novalidate><label class="sr" for="news-email">Email</label><input id="news-email" type="email" autocomplete="email" placeholder="Email for drops and restocks"><button class="btn btn--money" type="submit">Join</button></form></div>' +
      '<div><h4>Shop</h4><ul><li><a href="shop.html">Build a box</a></li><li><a href="product.html?f=energy">Energy</a></li><li><a href="product.html?f=everyday">Everyday</a></li><li><a href="performance.html">Performance</a></li></ul></div>' +
      '<div><h4>Learn</h4><ul><li><a href="ingredients.html">Ingredients</a></li><li><a href="about.html">About</a></li><li><a href="help.html#faq">FAQ</a></li></ul></div>' +
      '<div><h4>Help</h4><ul><li><a href="help.html#subscriptions">My Subscriptions</a></li><li><a href="help.html#shipping">Shipping</a></li><li><a href="mailto:hello@livefortified.com">hello@livefortified.com</a></li><li><a href="tel:+18886888351">(888) 688-8351</a></li></ul></div>' +
      '</div><div class="foot__legal"><span>&copy; 2026 FORTIFIED&reg;. Design mockup for internal review: checkout is simulated and nothing is charged.</span><span>These statements have not been evaluated by the Food and Drug Administration. This product is not intended to diagnose, treat, cure, or prevent any disease.</span></div></div></footer>';
  }

  // Overlays: scrim, cart drawer, checkout, toast
  document.body.insertAdjacentHTML("beforeend",
    '<div class="scrim" data-scrim></div>' +
    '<aside class="drawer" id="cart" role="dialog" aria-modal="true" aria-labelledby="cart-title" aria-hidden="true">' +
      '<div class="drawer__top"><h2 id="cart-title">Your box</h2><button class="x" type="button" data-close aria-label="Close box">' + icon("x") + "</button></div>" +
      '<div class="drawer__body" data-cart-body></div>' +
      '<div class="drawer__foot" data-cart-foot></div>' +
    "</aside>" +
    '<div class="checkout" id="checkout" role="dialog" aria-modal="true" aria-labelledby="co-title" aria-hidden="true"></div>' +
    '<div class="toast" role="status" aria-live="polite" data-toast></div>');

  var toastTimer;
  function toast(msg) {
    var t = $("[data-toast]"); t.textContent = msg; t.classList.add("is-on");
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove("is-on"); }, 2400);
  }
  function bumpCount() {
    $$("[data-count]").forEach(function (c) { c.textContent = count(); c.classList.remove("bump"); void c.offsetWidth; c.classList.add("bump"); });
  }

  // Focus handling for overlays
  var lastFocus = null, openLayer = null;
  function lockScroll(on) { document.documentElement.style.overflow = on ? "hidden" : ""; }
  function openCart() {
    lastFocus = document.activeElement; openLayer = "cart";
    renderCart(); $("#cart").classList.add("is-open"); $("#cart").setAttribute("aria-hidden", "false");
    $("[data-scrim]").classList.add("is-open"); lockScroll(true);
    setTimeout(function () { $("#cart [data-close]").focus(); }, 60);
  }
  function closeAll() {
    $("#cart").classList.remove("is-open"); $("#cart").setAttribute("aria-hidden", "true");
    $("#checkout").classList.remove("is-open"); $("#checkout").setAttribute("aria-hidden", "true");
    $("[data-scrim]").classList.remove("is-open"); lockScroll(false); openLayer = null;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && openLayer) closeAll();
    if (e.key === "Tab" && openLayer) {
      var box = openLayer === "cart" ? $("#cart") : $("#checkout");
      var f = $$('button:not([disabled]), a[href], input, select, [tabindex]:not([tabindex="-1"])', box).filter(function (el) { return el.offsetParent !== null; });
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });
  document.addEventListener("click", function (e) {
    var t = e.target;
    if (t.closest("[data-open-cart]")) { e.preventDefault(); openCart(); }
    else if (t.closest("[data-close]") || t.closest("[data-scrim]")) closeAll();
    else if (t.closest("[data-menu]")) {
      var open = document.body.classList.toggle("menu-open");
      t.closest("[data-menu]").setAttribute("aria-expanded", String(open));
    }
  });

  // ---------- Cart receipt ----------
  function progressHtml(n, plan) {
    plan = plan || cart.plan;
    var msg;
    if (plan !== "sub") msg = n === 0 ? "Add a pack to start your box." : n === 1 ? "Add <b>1 more pack</b> for Free Shipping. Subscribe to save up to 20%." : "Free Shipping unlocked. <b>Subscribe</b> to save up to 20% + Free Creatine.";
    else msg = n === 0 ? "Add a pack to start your box." : n === 1 ? "10% off. Add <b>1 more pack</b> for 15% off + Free Shipping." : n === 2 ? "15% off + Free Shipping. Add <b>1 more</b> for 20% off + Free Creatine For Life." : "<b>20% off</b>, Free Shipping and Free Creatine For Life.";
    var f = n === 0 ? 0 : n === 1 ? 1 / 3 : n === 2 ? 2 / 3 : 1;
    return '<div class="progress"><div class="progress__msg">' + msg + '</div><div class="progress__track"><div class="progress__fill" style="transform:scaleX(' + f + ')"></div></div></div>';
  }
  function freqHtml() {
    return '<div class="seg seg--full" role="group" aria-label="Purchase type" data-plan>' +
      '<button type="button" data-v="sub" aria-pressed="' + (cart.plan === "sub") + '">Subscribe</button>' +
      '<button type="button" data-v="otp" aria-pressed="' + (cart.plan === "otp") + '">One-time</button></div>' +
      (cart.plan === "sub" ? '<div class="freq-row"><span>Deliver every</span><div class="seg" role="group" aria-label="Delivery frequency" data-days>' +
        [30, 60, 90].map(function (d) { return '<button type="button" data-v="' + d + '" aria-pressed="' + (cart.days === d) + '">' + d + " days</button>"; }).join("") + "</div></div>" : "");
  }
  function renderCart(fresh) {
    var body = $("[data-cart-body]"), foot = $("[data-cart-foot]"), t = totals();
    if (!body) return;
    if (!t.n) {
      body.innerHTML = progressHtml(0) + '<div class="empty"><b>Your box is empty.</b>Pick a formula and an organic flavor. Every pack is a 30 day supply.</div>' +
        '<div style="display:grid;gap:10px"><a class="btn" href="shop.html">Build a box</a><a class="btn btn--ghost" href="product.html?f=energy">Shop Energy</a><a class="btn btn--ghost" href="product.html?f=everyday">Shop Everyday</a></div>';
      foot.innerHTML = ""; return;
    }
    var lines = cart.lines.map(function (l) {
      var key = l.f + "|" + l.v, each = PRICE * (1 - rate(count(), cart.plan));
      return '<div class="cart-line' + (fresh === key ? " line-in" : "") + '" data-key="' + key + '"><div class="pack">' + packImg(l.f, l.v) + "</div>" +
        "<div><b>" + FORMULA[l.f].name + "</b><small>" + FLAVOR[l.v] + "</small><br>" +
        '<div class="qty"><button type="button" data-dec aria-label="Remove one">&minus;</button><output class="num" aria-live="polite">' + l.qty + '</output><button type="button" data-inc aria-label="Add one">+</button></div></div>' +
        '<div class="cart-line__price">' + (cart.plan === "sub" ? "<s>" + money(PRICE * l.qty) + "</s>" : "") + money(each * l.qty) + "</div></div>";
    }).join("");
    if (t.creatine) lines += '<div class="cart-line"><div class="pack" style="display:grid;place-items:center;background:var(--teal-wash);color:var(--teal-ink)">' + icon("plus") + "</div><div><b>Free Creatine For Life</b><small>Unlocked at 3+ packs</small></div><div class=\"cart-line__price\" style=\"color:var(--teal-ink)\">FREE</div></div>";
    body.innerHTML = progressHtml(t.n) + lines + '<div style="margin-top:16px">' + freqHtml() + "</div>";
    foot.innerHTML =
      '<div class="total-row"><span>Subtotal</span><span>' + money(t.sub) + "</span></div>" +
      (t.save ? '<div class="total-row total-row--save"><span>Subscribe ' + Math.round(t.r * 100) + '% off</span><span>&minus;' + money(t.save) + "</span></div>" : "") +
      '<div class="total-row"><span>Shipping</span><span>' + (t.freeShip ? '<b style="color:var(--teal-ink)">FREE</b>' : "Calculated at checkout") + "</span></div>" +
      '<div class="total-row total-row--big"><span>Total</span><span>' + money(t.total) + "</span></div>" +
      '<button class="btn btn--money btn--block" type="button" data-checkout style="margin-top:12px">' + icon("lock") + "Checkout " + money(t.total) + "</button>" +
      (cart.plan === "sub" ? '<p class="legal">Renews every ' + cart.days + " days at the price shown plus tax until you cancel. Skip, swap or cancel online anytime.</p>" : "");
  }
  document.addEventListener("click", function (e) {
    var t = e.target, line = t.closest(".cart-line[data-key]");
    if (line && t.closest("[data-inc]")) { var l = cart.lines.filter(function (x) { return x.f + "|" + x.v === line.dataset.key; })[0]; setQty(line.dataset.key, l.qty + 1); }
    if (line && t.closest("[data-dec]")) { var m = cart.lines.filter(function (x) { return x.f + "|" + x.v === line.dataset.key; })[0]; setQty(line.dataset.key, m.qty - 1); }
    var plan = t.closest("#cart [data-plan] button"); if (plan) { cart.plan = plan.dataset.v; save(); renderCart(); }
    var days = t.closest("#cart [data-days] button"); if (days) { cart.days = +days.dataset.v; save(); renderCart(); }
    if (t.closest("[data-checkout]")) openCheckout();
  });

  // ---------- Checkout (simulated) ----------
  function receiptHtml(title, meta) {
    var t = totals();
    return '<div class="sheet-wrap"><div class="sheet"><div class="sheet__head"><div class="sheet__brand">FORTIFIED.</div><div class="sheet__title">' + title + '</div><div class="sheet__meta">' + meta + "</div></div>" +
      '<ul class="items">' + cart.lines.map(function (l) {
        return '<li class="item"><span class="item__name">' + l.qty + "&times; " + FORMULA[l.f].name + "<small>" + FLAVOR[l.v] + '</small></span><span class="item__lead"></span><span class="item__val">' + money(PRICE * l.qty) + "</span></li>";
      }).join("") + (t.creatine ? '<li class="item item--add"><span class="item__name">Free Creatine For Life</span><span class="item__lead"></span><span class="item__val">0.00</span></li>' : "") + "</ul>" +
      '<div class="totals"><div class="total-row"><span>Subtotal</span><span>' + money(t.sub) + "</span></div>" +
      (t.save ? '<div class="total-row total-row--save"><span>Subscribe ' + Math.round(t.r * 100) + '% off</span><span>&minus;' + money(t.save) + "</span></div>" : "") +
      '<div class="total-row"><span>Shipping</span><span>' + (t.freeShip ? "FREE" : "At checkout") + "</span></div>" +
      '<div class="total-row"><span>Tax</span><span>At checkout</span></div>' +
      '<div class="total-row total-row--big"><span>Total</span><span>' + money(t.total) + "</span></div></div>" +
      '<div class="sheet__foot">' + (cart.plan === "sub" ? "Ships every " + cart.days + " days. Skip or cancel online anytime." : "One-time order.") + '</div><div class="barcode" aria-hidden="true"></div></div></div>';
  }
  function openCheckout() {
    if (!count()) return;
    var co = $("#checkout"), t = totals(), sub = cart.plan === "sub";
    co.innerHTML =
      '<div class="checkout__head"><div class="wrap"><span class="logo">FORTIFIED<i>.</i></span><span class="secure">' + icon("lock") + 'Secure checkout</span><button class="x" type="button" data-close aria-label="Close checkout">' + icon("x") + "</button></div></div>" +
      '<div data-co-form class="checkout__grid"><div>' +
        '<h2 id="co-title" class="display d3" style="margin-bottom:22px">Checkout</h2>' +
        '<div class="express"><button class="shop" type="button" data-place>Shop Pay</button><button class="apple" type="button" data-place>Apple Pay</button></div>' +
        '<div class="or">or pay by card</div>' +
        '<form novalidate data-co>' +
          '<fieldset class="fs"><legend>Contact</legend><div class="field"><label for="co-email">Email</label><input id="co-email" type="email" autocomplete="email" inputmode="email" required><span class="field__err" aria-live="polite"></span></div></fieldset>' +
          '<fieldset class="fs"><legend>Ship to</legend><div class="row2"><div class="field"><label for="co-fn">First name</label><input id="co-fn" autocomplete="given-name" required><span class="field__err"></span></div><div class="field"><label for="co-ln">Last name</label><input id="co-ln" autocomplete="family-name" required><span class="field__err"></span></div></div>' +
          '<div class="field"><label for="co-ad">Address</label><input id="co-ad" autocomplete="street-address" required><span class="field__err"></span></div>' +
          '<div class="row3"><div class="field"><label for="co-ci">City</label><input id="co-ci" autocomplete="address-level2" required><span class="field__err"></span></div><div class="field"><label for="co-st">State</label><select id="co-st" autocomplete="address-level1"><option>CA</option><option>FL</option><option>NY</option><option>TX</option><option>WA</option></select></div><div class="field"><label for="co-zp">ZIP</label><input id="co-zp" inputmode="numeric" autocomplete="postal-code" required><span class="field__err"></span></div></div></fieldset>' +
          '<fieldset class="fs"><legend>Payment</legend><div class="field"><label for="co-cc">Card number</label><input id="co-cc" inputmode="numeric" autocomplete="off" placeholder="Simulated. Do not enter real card data."></div><div class="row2"><div class="field"><label for="co-ex">Expiry</label><input id="co-ex" autocomplete="off" placeholder="MM / YY"></div><div class="field"><label for="co-cv">CVC</label><input id="co-cv" autocomplete="off" placeholder="3 digits"></div></div></fieldset>' +
          (sub ? '<label class="consent"><input type="checkbox" id="co-consent"><span>I agree my order renews every ' + cart.days + " days at " + money(t.total) + " plus tax until I cancel. I can skip or cancel online before my next billing date.</span></label>" : "") +
          '<span class="field__err" data-consent-err aria-live="polite"></span>' +
          '<button class="btn btn--money btn--block" type="submit" style="margin-top:6px">' + icon("lock") + "Place order " + money(t.total) + "</button>" +
          '<p class="legal" style="text-align:center">Mockup only. Nothing is charged or sent.</p>' +
        "</form></div>" +
        "<aside>" + receiptHtml("Your box", sub ? "Subscribe" : "One-time") + "</aside></div>" +
      '<div data-co-done hidden></div>';
    lastFocus = lastFocus || document.activeElement;
    $("#cart").classList.remove("is-open"); $("#cart").setAttribute("aria-hidden", "true");
    $("[data-scrim]").classList.remove("is-open");
    co.classList.add("is-open"); co.setAttribute("aria-hidden", "false"); openLayer = "checkout"; lockScroll(true);
    co.scrollTop = 0; setTimeout(function () { $("#co-email").focus(); }, 80);
  }
  function placeOrder() {
    var co = $("#checkout"), t = totals(), sub = cart.plan === "sub";
    var done = $("[data-co-done]", co);
    done.innerHTML = '<div class="done"><h2 class="display d2">You’re in.</h2><p class="lede" style="margin-left:auto;margin-right:auto">' +
      (sub ? "Your first box ships in 1 to 3 business days. We’ll email you before every renewal." : "Your box ships in 1 to 3 business days.") + "</p>" +
      '<div class="print" style="position:relative;margin-top:32px">' + receiptHtml("Order confirmed", "Simulated order") + '<span class="stamp" style="right:-12px;top:96px;border-color:var(--teal-ink);color:var(--teal-ink)">Paid<small>in full</small></span></div>' +
      '<div style="display:grid;gap:10px;margin-top:32px"><a class="btn" href="help.html#subscriptions">Manage My Subscriptions</a><button class="btn btn--ghost" type="button" data-close>Keep browsing</button></div></div>';
    $("[data-co-form]", co).hidden = true; done.hidden = false; co.scrollTop = 0;
    $$(".print .items > li", done).forEach(function (li, i) { li.style.setProperty("--i", i); });
    replaceCart([], cart.plan, cart.days);
  }
  document.addEventListener("click", function (e) { if (e.target.closest("[data-place]")) placeOrder(); });
  document.addEventListener("submit", function (e) {
    var f = e.target;
    if (f.matches("[data-co]")) {
      e.preventDefault();
      var ok = true;
      $$("input[required]", f).forEach(function (inp) {
        var fld = inp.closest(".field"), err = $(".field__err", fld), bad = !inp.value.trim() || (inp.type === "email" && !/^\S+@\S+\.\S+$/.test(inp.value));
        fld.classList.toggle("is-bad", bad); err.textContent = bad ? (inp.type === "email" ? "Enter an email like name@example.com." : "Required.") : "";
        if (bad && ok) { inp.focus(); ok = false; }
      });
      var c = $("#co-consent"), ce = $("[data-consent-err]");
      if (ok && c && !c.checked) { ce.textContent = "Tick the box to agree to the renewal terms."; c.focus(); ok = false; } else if (ce) ce.textContent = "";
      if (ok) placeOrder();
    }
    if (f.matches("[data-news]")) {
      e.preventDefault();
      var inp = $("input", f);
      if (!/^\S+@\S+\.\S+$/.test(inp.value)) { toast("Enter a valid email to join."); inp.focus(); return; }
      inp.value = ""; toast("You’re on the list.");
    }
    if (f.matches("[data-waitlist]")) {
      e.preventDefault();
      var w = $("input", f);
      if (!/^\S+@\S+\.\S+$/.test(w.value)) { $(".field__err", f).textContent = "Enter an email like name@example.com."; w.focus(); return; }
      f.innerHTML = '<p class="lede" style="color:#fff;margin:0"><b>You’re on the list.</b> We’ll email you once when Performance drops. Nothing else.</p>';
    }
  });

  // ---------- Page: home hero receipt ----------
  function labelItems(f) {
    return BASE.map(function (b) { return [b[0], b[1], ""]; }).concat(FORMULA[f].adds.map(function (a) { return [a[0], a[1], "add"]; }));
  }
  function itemsHtml(f, withVoid) {
    var html = labelItems(f).map(function (it, i) {
      return '<li class="item' + (it[2] ? " item--add" : "") + '" style="--i:' + i + '"><span class="item__name">' + it[0] + '</span><span class="item__lead"></span><span class="item__val">' + it[1] + "</span></li>";
    }).join("");
    if (withVoid) html += VOID.map(function (v, i) { return '<li class="item item--void" style="--i:' + (i + 9) + '"><span class="item__name">' + v + '</span><span class="item__lead"></span><span class="item__val">VOID</span></li>'; }).join("");
    return html;
  }
  var hero = $("[data-hero-receipt]");
  if (hero) {
    var hs = { f: "energy", v: "watermelon" };
    var drawHero = function (reprint) {
      $("[data-hero-title]", hero).textContent = FORMULA[hs.f].name;
      $("[data-hero-meta]", hero).textContent = FLAVOR[hs.v] + " · per serving";
      var list = $("[data-hero-items]", hero); list.innerHTML = itemsHtml(hs.f, false);
      $("[data-hero-add]", hero).innerHTML = icon("plus") + "Add " + FORMULA[hs.f].name + " to box · " + money(PRICE * (1 - DISC));
      $$("[data-hf] button", hero).forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.v === hs.f)); });
      $$("[data-hv] button", hero).forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.v === hs.v)); });
      if (reprint) { var s = $(".print", hero); s.classList.remove("print"); void s.offsetWidth; s.classList.add("print"); }
    };
    hero.addEventListener("click", function (e) {
      var b = e.target.closest("[data-hf] button"); if (b) { hs.f = b.dataset.v; drawHero(true); }
      var v = e.target.closest("[data-hv] button"); if (v) { hs.v = v.dataset.v; drawHero(false); }
      if (e.target.closest("[data-hero-add]")) { add(hs.f, hs.v, 1, { plan: "sub" }); toast(FORMULA[hs.f].name + ", " + FLAVOR[hs.v] + " added to your box."); openCart(); }
    });
    drawHero(false);
  }

  // ---------- Page: subscription control demo ----------
  var ui = $("[data-sub-ui]");
  if (ui) {
    var msgs = { skip: "Next box skipped. We’ll ship again in 60 days.", swap: "Swapped to Organic Salty Orange for the next box.", delay: "Delivery moved to every 60 days.", cancel: "Cancelled. No more charges. You can restart anytime." };
    ui.addEventListener("click", function (e) {
      var b = e.target.closest("[data-act]"); if (!b) return;
      $$("[data-act]", ui).forEach(function (x) { x.classList.toggle("is-on", x === b); });
      $("[data-ui-toast]", ui).textContent = msgs[b.dataset.act];
    });
  }

  // ---------- Page: product ----------
  var pd = $("[data-product]");
  if (pd) {
    var qf = (new URLSearchParams(location.search).get("f") || "energy").toLowerCase();
    if (!FORMULA[qf]) qf = "energy";
    var other = qf === "energy" ? "everyday" : "energy";
    var mixMode = pd.hasAttribute("data-flavor-mode");
    document.documentElement.setAttribute("data-page", qf);
    $$('.nav a, .mnav a').forEach(function (a) { if (a.getAttribute("href") === "product.html?f=" + qf) a.setAttribute("aria-current", "page"); });
    document.title = FORMULA[qf].name + " | Fortified";
    var ps = { v: "watermelon", qty: 2, plan: "sub", q: { watermelon: 1, orange: 1 } };
    var MAXQ = 24;
    $$("[data-field]").forEach(function (el) { el.classList.add("field--" + qf); });
    $$("[data-t]").forEach(function (el) {
      var k = el.getAttribute("data-t"), F = FORMULA[qf], O = FORMULA[other];
      var map = { name: F.name, badge: F.badge, line: F.line, base: F.base, other: O.name, otherLine: O.line, otherBadge: O.badge,
        adds: F.adds.map(function (a) { return a[0]; }).join(" + ") };
      if (map[k] != null) el.textContent = map[k];
    });
    $$("[data-other-link]").forEach(function (a) { a.href = (mixMode ? "product-flavors.html?f=" : "product.html?f=") + other; });
    $("[data-pd-items]").innerHTML = itemsHtml(qf, true);
    $("[data-other-pack]").setAttribute("data-pack", other + "|watermelon");
    var total = function () { return mixMode ? ps.q.watermelon + ps.q.orange : ps.qty; };
    $$("[data-flavor-pack]").forEach(function (el) { el.innerHTML = packImg(qf, el.dataset.flavorPack); });
    $$("[data-stack]").forEach(function (fig) { $("[data-stack-img]", fig).innerHTML = packImg(qf, fig.dataset.stack, true); });

    var drawTiers = function (n) {
      var sub = ps.plan === "sub";
      $$("[data-tiers] [data-tier]").forEach(function (t) { var k = +t.dataset.tier; t.classList.toggle("is-on", sub && n >= k); t.classList.toggle("is-next", sub && n + 1 === k); });
      $("[data-tiers]").classList.toggle("is-off", !sub);
      var msg;
      if (!sub) msg = "Tier savings and Free Creatine For Life come with <b>Subscribe</b>.";
      else if (n >= 3) msg = "<b>20% off + Free Creatine For Life</b> unlocked.";
      else msg = "Add <b>" + (3 - n) + " more " + (3 - n === 1 ? "pack" : "packs") + "</b> for 20% off + Free Creatine For Life.";
      $("[data-tiers-msg]").innerHTML = msg;
    };

    var drawPd = function () {
      var n = total(), r = rate(n, ps.plan), tot = PRICE * n * (1 - r);
      var packEl = $("[data-pd-pack]"); if (packEl) packEl.innerHTML = packImg(qf, ps.v, true);
      var stack = $("[data-pd-stack]");
      if (stack) {
        var shown = 0;
        $$("[data-stack]", stack).forEach(function (fig) { var k = ps.q[fig.dataset.stack]; fig.classList.toggle("is-out", !k); $(".pd__count", fig).textContent = "×" + k; if (k) shown++; });
        stack.setAttribute("data-n", shown);
      }
      $$("[data-plan-price]").forEach(function (el) { el.textContent = money(PRICE * n * (1 - rate(n, el.dataset.planPrice))); });
      var rc = $("[data-pd-receipt]");
      if (rc) {
        var prev = ps.lines || {}, now = {}, html = "";
        var line = function (key, name, val, cls) {
          now[key] = name + val;
          html += '<li class="item' + (cls ? " " + cls : "") + (prev[key] !== now[key] ? " line-in" : "") + '"><span class="item__name">' + name + '</span><span class="item__lead"></span><span class="item__val">' + val + "</span></li>";
        };
        ["watermelon", "orange"].forEach(function (fv) { if (ps.q[fv]) line(fv, ps.q[fv] + "× " + FLAVOR[fv], money(PRICE * ps.q[fv])); });
        if (r) line("save", "Subscribe " + Math.round(r * 100) + "% off", "&minus;" + money(PRICE * n * r), "item--save");
        if (ps.plan === "sub" && n >= 3) line("creatine", "Free Creatine For Life", "FREE", "item--add");
        line("ship", "Shipping", n >= 2 ? "FREE" : "At checkout");
        rc.innerHTML = html; ps.lines = now;
        $("[data-pd-receipt-meta]").textContent = FORMULA[qf].name + " · " + (ps.plan === "sub" ? "Subscribe" : "One-time");
      }
      if (mixMode) {
        $$("[data-fq]").forEach(function (row) {
          var v = row.dataset.fq, inp = $("input", row);
          if (document.activeElement !== inp) inp.value = ps.q[v];
          $('[data-step="-1"]', row).disabled = ps.q[v] <= 0 || n <= 1;
          $('[data-step="1"]', row).disabled = n >= MAXQ;
          row.classList.toggle("is-zero", ps.q[v] === 0);
        });
      } else {
        $$("[data-pv] button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.v === ps.v)); });
        var qIn = $("#pd-qty"); if (document.activeElement !== qIn) qIn.value = ps.qty;
        $('[data-pq] [data-step="-1"]').disabled = ps.qty <= 1;
        $('[data-pq] [data-step="1"]').disabled = ps.qty >= MAXQ;
      }
      $$("[data-pp] button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.v === ps.plan)); });
      var ship = n >= 2 ? "Free Shipping on this order." : "Shipping is calculated at checkout, free on 2+ packs.";
      $("[data-plan-note]").innerHTML = ps.plan === "sub"
        ? "<b>Subscribe:</b> " + Math.round(r * 100) + "% off every order, ships every 30, 60 or 90 days, skip or cancel online anytime. " + ship
        : "<b>One-time:</b> full price, one delivery, no subscription. " + ship;
      $("[data-pd-price]").innerHTML = (r ? "<s>" + money(PRICE * n) + "</s>" : "") + money(tot);
      var saveEl = $("[data-pd-save]");
      if (saveEl) { saveEl.textContent = r ? "You save " + money(PRICE * n * r) : ""; saveEl.hidden = !r; }
      $$("[data-fq-sub]").forEach(function (el) { var k = ps.q[el.dataset.fqSub]; el.textContent = k ? k + (k === 1 ? " pack · " : " packs · ") + money(PRICE * k * (1 - r)) : "Not in this order"; });
      $("[data-pd-perk]").textContent = n >= 2 ? "Free Shipping" : "Free Shipping at 2+";
      $("[data-pd-add]").innerHTML = icon("plus") + "Add " + n + (n === 1 ? " pack" : " packs") + " · " + money(tot);
      drawTiers(n);
    };

    pd.addEventListener("click", function (e) {
      var v = e.target.closest("[data-pv] button"); if (v) { ps.v = v.dataset.v; drawPd(); }
      var q = e.target.closest("[data-pq] [data-step]"); if (q && !q.disabled) { ps.qty = Math.min(MAXQ, Math.max(1, ps.qty + +q.dataset.step)); drawPd(); }
      var fq = e.target.closest("[data-fq] [data-step]");
      if (fq && !fq.disabled) { var fv = fq.closest("[data-fq]").dataset.fq; ps.q[fv] = Math.max(0, ps.q[fv] + +fq.dataset.step); ps.v = ps.q[fv] > 0 ? fv : (fv === "watermelon" ? "orange" : "watermelon"); drawPd(); }
      var p = e.target.closest("[data-pp] button"); if (p) { ps.plan = p.dataset.v; drawPd(); }
      if (e.target.closest("[data-pd-add]")) {
        if (mixMode) { ["watermelon", "orange"].forEach(function (fv) { if (ps.q[fv]) add(qf, fv, ps.q[fv], { plan: ps.plan }); }); }
        else add(qf, ps.v, ps.qty, { plan: ps.plan });
        openCart();
      }
    });
    if (mixMode) {
      $$("[data-fq] input").forEach(function (inp) {
        var fv = inp.closest("[data-fq]").dataset.fq;
        inp.addEventListener("input", function () { var k = parseInt(inp.value, 10); if (k >= 0) { var o = fv === "watermelon" ? ps.q.orange : ps.q.watermelon; ps.q[fv] = Math.min(MAXQ - o, k); if (ps.q[fv] + o < 1) ps.q[fv] = 1; ps.v = fv; drawPd(); } });
        inp.addEventListener("blur", function () { inp.value = ps.q[fv]; });
      });
    } else {
      var qInput = $("#pd-qty");
      qInput.addEventListener("input", function () { var k = parseInt(qInput.value, 10); if (k >= 1) { ps.qty = Math.min(MAXQ, k); drawPd(); } });
      qInput.addEventListener("blur", function () { qInput.value = ps.qty; });
    }
    drawPd();
  }

  // ---------- Page: shop builder ----------
  var b = $("[data-builder]");
  if (b) {
    var bs = { n: 2, slots: [["energy", "watermelon"], ["everyday", "orange"], ["energy", "orange"], ["everyday", "watermelon"]], plan: "sub", days: 30 };
    var drawB = function (changed) {
      $$("[data-bn] button", b).forEach(function (x) { x.setAttribute("aria-pressed", String(+x.dataset.v === bs.n)); });
      $$("[data-bn] button", b).forEach(function (x) { var k = +x.dataset.v; $("[data-each]", x).textContent = money(PRICE * (1 - rate(k, bs.plan))); });
      var slots = "";
      for (var i = 0; i < bs.n; i++) {
        var s = bs.slots[i];
        slots += '<div class="slotrow" data-i="' + i + '"><div class="pack">' + packImg(s[0], s[1]) + '</div><div class="slotrow__body"><div class="slotrow__label">Pack ' + (i + 1) + "</div>" +
          '<div class="seg seg--formula" role="group" aria-label="Formula for pack ' + (i + 1) + '">' + ["energy", "everyday"].map(function (f) { return '<button type="button" data-k="0" data-v="' + f + '" aria-pressed="' + (s[0] === f) + '">' + FORMULA[f].name + "</button>"; }).join("") + "</div>" +
          '<div class="seg" role="group" aria-label="Organic flavor for pack ' + (i + 1) + '">' + ["watermelon", "orange"].map(function (v) { return '<button type="button" data-k="1" data-v="' + v + '" aria-pressed="' + (s[1] === v) + '">' + FLAVOR[v] + "</button>"; }).join("") + "</div></div></div>";
      }
      $("[data-slots]", b).innerHTML = slots;
      $$("[data-bp] button", b).forEach(function (x) { x.setAttribute("aria-pressed", String(x.dataset.v === bs.plan)); });
      $("[data-bdays]", b).hidden = bs.plan !== "sub";
      $$("[data-bdays] button", b).forEach(function (x) { x.setAttribute("aria-pressed", String(+x.dataset.v === bs.days)); });
      // Receipt
      var n = bs.n, sub = n * PRICE, sv = sub * rate(n, bs.plan), grouped = {};
      for (var j = 0; j < n; j++) { var k = bs.slots[j].join("|"); grouped[k] = (grouped[k] || 0) + 1; }
      var items = Object.keys(grouped).map(function (k, i) {
        var p = k.split("|");
        return '<li class="item' + (changed === k ? " line-in" : "") + '"><span class="item__name">' + grouped[k] + "&times; " + FORMULA[p[0]].name + "<small>" + FLAVOR[p[1]] + '</small></span><span class="item__lead"></span><span class="item__val">' + money(PRICE * grouped[k]) + "</span></li>";
      }).join("");
      if (n >= 3 && bs.plan === "sub") items += '<li class="item item--add line-in"><span class="item__name">Free Creatine For Life</span><span class="item__lead"></span><span class="item__val">0.00</span></li>';
      $("[data-b-items]", b).innerHTML = items;
      $("[data-b-meta]", b).textContent = bs.plan === "sub" ? "Subscribe · every " + bs.days + " days" : "One-time order";
      $("[data-b-totals]", b).innerHTML =
        '<div class="total-row"><span>Subtotal</span><span>' + money(sub) + "</span></div>" +
        (sv ? '<div class="total-row total-row--save"><span>Subscribe ' + pct(n) + ' off</span><span>&minus;' + money(sv) + "</span></div>" : "") +
        '<div class="total-row"><span>Shipping</span><span>' + (n >= 2 ? "FREE" : "At checkout") + "</span></div>" +
        '<div class="total-row total-row--big"><span>Total</span><span>' + (sv ? "<s>" + money(sub) + "</s>" : "") + money(sub - sv) + "</span></div>";
      $("[data-b-progress]", b).innerHTML = progressHtml(n, bs.plan);
      $$("[data-b-go]:not(.shop):not(.apple)").forEach(function (g) { g.innerHTML = icon("lock") + "Checkout " + money(sub - sv); });
      $$("[data-b-sum]").forEach(function (g) { g.textContent = n + (n === 1 ? " pack" : " packs") + (bs.plan === "sub" ? ", every " + bs.days + " days" : ", one-time"); });
      $$("[data-b-total]").forEach(function (g) { g.textContent = money(sub - sv); });
      $("[data-b-legal]", b).hidden = bs.plan !== "sub";
    };
    b.addEventListener("click", function (e) {
      var t = e.target;
      var x = t.closest("[data-bn] button"); if (x) { bs.n = +x.dataset.v; drawB(); }
      var sbt = t.closest(".slotrow .seg button");
      if (sbt) { var i = +sbt.closest(".slotrow").dataset.i; bs.slots[i][+sbt.dataset.k] = sbt.dataset.v; drawB(bs.slots[i].join("|")); }
      var p = t.closest("[data-bp] button"); if (p) { bs.plan = p.dataset.v; drawB(); }
      var d = t.closest("[data-bdays] button"); if (d) { bs.days = +d.dataset.v; drawB(); }
    });
    document.addEventListener("click", function (e) {
      if (!e.target.closest("[data-b-go]")) return;
      var grouped = {}, lines = [];
      for (var j = 0; j < bs.n; j++) { var k = bs.slots[j].join("|"); grouped[k] = (grouped[k] || 0) + 1; }
      Object.keys(grouped).forEach(function (k) { var p = k.split("|"); lines.push({ f: p[0], v: p[1], qty: grouped[k] }); });
      replaceCart(lines, bs.plan, bs.days); lastFocus = e.target.closest("[data-b-go]"); openCheckout();
    });
    drawB();
    var sticky = $("[data-sticky]"), sum = $("[data-b-receipt]");
    if (sticky && sum && "IntersectionObserver" in window) {
      new IntersectionObserver(function (en) { sticky.classList.toggle("is-on", !en[0].isIntersecting); }, { rootMargin: "0px 0px -20% 0px" }).observe(sum);
    }
  }

  // ---------- Print on first view ----------
  $$("[data-print-on-view]").forEach(function (el) {
    $$(".items > li", el).forEach(function (li, i) { li.style.setProperty("--i", i); });
    if (!("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { el.classList.add("print"); io.disconnect(); } }, { threshold: .25 });
    io.observe(el);
  });

  hydratePacks(document);
  $$("[data-count]").forEach(function (c) { c.textContent = count(); });
  renderCart();
})();
