/* Fortified theme: header, cart drawer (Shopify Ajax Cart API), product buy box
   wired to real variants and Loop selling plans, scroll reveal. No dependencies. */
(function () {
  "use strict";
  var FF = window.FF || {};
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  // Shopify money format, e.g. "${{amount}}"
  function money(cents) {
    var fmt = FF.money || "${{amount}}";
    var v = (Math.round(cents) / 100);
    var two = v.toFixed(2), parts = two.split(".");
    var withCommas = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return fmt.replace(/\{\{\s*(\w+)\s*\}\}/, function (_, k) {
      if (k === "amount_no_decimals") return withCommas;
      if (k === "amount_with_comma_separator") return parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "," + parts[1];
      return withCommas + "." + parts[1];
    });
  }
  function shortTitle(t) { return String(t).split(" by ")[0].split(" Hydration")[0].split(" Electrolyte")[0]; }
  function planLabel(n) { return /90|3 month|quarter/i.test(n) ? "Every 3 months" : /30|month/i.test(n) ? "Monthly" : n; }
  function flavorName(t) { return /organic/i.test(t) ? t : "Organic " + t; }

  var toastTimer;
  function toast(msg) {
    var t = $("[data-toast]"); if (!t) return;
    t.textContent = msg; t.classList.add("is-on");
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove("is-on"); }, 2600);
  }

  // ---------- Menu ----------
  document.addEventListener("click", function (e) {
    var m = e.target.closest("[data-menu]");
    if (m) { var open = document.body.classList.toggle("menu-open"); m.setAttribute("aria-expanded", String(open)); }
  });

  // ---------- Cart drawer ----------
  var drawer = $("#cart"), scrim = $("[data-scrim]"), lastFocus = null;
  function lock(on) { document.documentElement.style.overflow = on ? "hidden" : ""; }
  function openCart() {
    if (!drawer) { location.href = "/cart"; return; }
    lastFocus = document.activeElement;
    drawer.classList.add("is-open"); drawer.setAttribute("aria-hidden", "false");
    scrim.classList.add("is-open"); lock(true);
    refreshCart();
    setTimeout(function () { var c = $("[data-close]", drawer); if (c) c.focus(); }, 60);
  }
  function closeCart() {
    if (!drawer) return;
    drawer.classList.remove("is-open"); drawer.setAttribute("aria-hidden", "true");
    scrim.classList.remove("is-open"); lock(false);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  document.addEventListener("click", function (e) {
    if (e.target.closest("[data-open-cart]")) { e.preventDefault(); openCart(); }
    else if (e.target.closest("[data-close]") || e.target.closest("[data-scrim]")) closeCart();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && drawer && drawer.classList.contains("is-open")) closeCart();
    if (e.key === "Tab" && drawer && drawer.classList.contains("is-open")) {
      var f = $$('button:not([disabled]), a[href], input:not([disabled])', drawer).filter(function (el) { return el.offsetParent !== null; });
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });

  // ---------- Free Creatine For Life of Subscription ----------
  // 1 free creatine is kept in the cart while it holds FF.creatineAt or more subscription
  // packs, on the plan matching the packs' delivery frequency, and removed below that.
  var CR = FF.creatine || null, UP = FF.upsell || null;
  function isCreatine(it) { return !!CR && +it.variant_id === +CR.id; }
  // 2nd creatine bag: offered on Every 3 months while the free bag is quarterly, max 1.
  function isUpsell(it) { return !!UP && +it.variant_id === +UP.id; }
  function quarterlyFree(cart) {
    return (cart.items || []).some(function (it) { return isCreatine(it) && it.selling_plan_allocation && String(it.selling_plan_allocation.selling_plan.id) === String(CR.quarterly); });
  }
  function subCount(cart) {
    var m = 0, q = 0;
    (cart.items || []).forEach(function (it) {
      if (isCreatine(it) || isUpsell(it) || !it.selling_plan_allocation) return;
      if (/90|3 month|quarter/i.test(it.selling_plan_allocation.selling_plan.name)) q += it.quantity; else m += it.quantity;
    });
    return { n: m + q, plan: q >= m ? "quarterly" : "monthly" };
  }
  function post(url, data) {
    return fetch(url, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(data) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.description || j.message || "Cart error"); return j; }); });
  }
  function getCart() { return fetch(FF.routes.cart, { headers: { Accept: "application/json" } }).then(function (r) { return r.json(); }); }
  // Returns a promise of the (possibly updated) cart and whether it changed.
  function syncCreatine(cart) {
    if (!CR) return Promise.resolve({ cart: cart, changed: false });
    var s = subCount(cart), want = s.n >= (FF.creatineAt || 3);
    var planId = want ? (CR[s.plan] || CR.monthly || CR.quarterly || null) : null;
    var lines = (cart.items || []).filter(isCreatine);
    var ok = want && lines.length === 1 && lines[0].quantity === 1 &&
      String(lines[0].selling_plan_allocation ? lines[0].selling_plan_allocation.selling_plan.id : "") === String(planId || "");
    var upAllowed = want && s.plan === "quarterly" && !!CR.quarterly;
    var ups = (cart.items || []).filter(isUpsell), upFix = {};
    ups.forEach(function (l, i) { var q = upAllowed && i === 0 ? 1 : 0; if (l.quantity !== q) upFix[l.key] = q; });
    var upDirty = Object.keys(upFix).length > 0;
    if (((!want && !lines.length) || ok) && !upDirty) return Promise.resolve({ cart: cart, changed: false });
    var onlyUp = ok || (!want && !lines.length), updates = upFix;
    if (!ok) lines.forEach(function (l) { updates[l.key] = 0; });
    else want = false; // creatine already right; only the 2nd bag changed
    var chain = Object.keys(updates).length ? post(FF.routes.cartUpdate || "/cart/update.js", { updates: updates }) : Promise.resolve();
    if (want) chain = chain.then(function () {
      var it = { id: +CR.id, quantity: 1, properties: { _ff_gift: "creatine" } };
      if (planId) it.selling_plan = +planId;
      return post(FF.routes.cartAdd, { items: [it] });
    });
    return chain.then(getCart).then(function (c) { return { cart: c, changed: true, added: want, upOnly: onlyUp }; })
      .catch(function () { return getCart().then(function (c) { return { cart: c, changed: false }; }); });
  }

  // ---------- Quick buy in an empty cart: formula, organic flavor, packs, plan, plus one-time creatine ----------
  var QB = FF.quick || null, qb = { p: 0, v: 0, n: 2, plan: "sub" };
  function qbUnit(v, prod, plan, n) {
    if (plan === "otp") return n >= 2 ? Math.round(v.price * .85) : v.price;
    if (plan === "sub" && FF.volumeTiers) return Math.round(v.price * (n >= 2 ? .85 : .9));
    var id = plan === "q3" ? prod.quarterly : prod.monthly;
    return id && v.plans[String(id)] != null ? v.plans[String(id)] : v.price;
  }
  function qbHtml() {
    if (!QB || !QB.products || !QB.products.length) return "";
    var prod = QB.products[qb.p], v = prod.variants[qb.v] || prod.variants[0], n = qb.n;
    var h = '<div class="qb" data-qb>';
    h += '<p class="qb__h">Build your box</p><p class="qb__sub">Pick a formula, an organic flavor and how often.</p>';
    h += '<div><p class="qb__label">Formula</p><div class="qb__pills">' + QB.products.map(function (pp, i) { return '<button type="button" class="qb__pill qb__pill--plain" data-qb-p="' + i + '" aria-pressed="' + (i === qb.p) + '">' + esc(pp.label) + '</button>'; }).join("") + '</div></div>';
    h += '<div><p class="qb__label">Organic flavor</p><div class="qb__pills">' + prod.variants.map(function (vv, i) { return '<button type="button" class="qb__pill" data-qb-v="' + i + '" aria-pressed="' + (i === qb.v) + '"' + (vv.available ? "" : " disabled") + '>' + (vv.img ? '<img src="' + esc(vv.img) + '" alt="" loading="lazy">' : "") + esc(flavorName(vv.title)) + '</button>'; }).join("") + '</div></div>';
    h += '<div class="qb__row"><p class="qb__label" style="margin:0">Packs</p><div class="stepper stepper--sm"><button type="button" data-qb-n="-1" aria-label="One fewer pack"' + (n <= 1 ? " disabled" : "") + '><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14"/></svg></button><output class="num" aria-live="polite">' + n + '</output><button type="button" data-qb-n="1" aria-label="One more pack"' + (n >= 12 ? " disabled" : "") + '><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></button></div></div>';
    var plans = [["sub", "Monthly"], ["q3", "Every 3 months"], ["otp", "One-time"]].filter(function (x) { return x[0] === "otp" || (x[0] === "sub" ? prod.monthly : prod.quarterly); });
    h += '<div><p class="qb__label">Purchase</p><div class="qb__plans">' + plans.map(function (x) { return '<button type="button" class="qb__plan" data-qb-plan="' + x[0] + '" aria-pressed="' + (x[0] === qb.plan) + '">' + x[1] + '<small>' + money(qbUnit(v, prod, x[0], n) * n) + '</small></button>'; }).join("") + '</div></div>';
    var cre = n >= (FF.creatineAt || 3) && qb.plan !== "otp";
    h += '<p class="qb__note">' + (qb.plan === "otp" ? (n >= 2 ? "15% off and Free Shipping on 2+ packs." : "Shipping $5.99, free from 2 packs.") : (cre ? "Free Shipping, plus Free Creatine For Life of Subscription." : "Free Shipping. Free Creatine For Life of Subscription from 3 packs.")) + ' Cancel at any time.</p>';
    h += '<button type="button" class="btn btn--money btn--block" data-qb-add>Add ' + n + (n === 1 ? " pack" : " packs") + ' · ' + money(qbUnit(v, prod, qb.plan, n) * n) + '</button>';
    if (QB.creatine) h += '<div class="qb__cr">' + (QB.creatine.img ? '<img src="' + esc(QB.creatine.img) + '" alt="" loading="lazy">' : "<span></span>") + '<div><b>Creatine Monohydrate</b><small>One-time pouch, 45 servings · ' + money(QB.creatine.price) + '</small></div><button type="button" class="btn btn--ghost" data-qb-cr>Add</button></div>';
    return h + '</div>';
  }
  function qbMount() {
    $$("[data-qb-mount]").forEach(function (m) { m.innerHTML = qbHtml(); });
    var dm = $("[data-cart-body] [data-qb-slot]"); if (dm) dm.innerHTML = qbHtml();
  }
  document.addEventListener("click", function (e) {
    var root = e.target.closest("[data-qb]"); if (!root || !QB) return;
    var t;
    if ((t = e.target.closest("[data-qb-p]"))) { qb.p = +t.getAttribute("data-qb-p"); qb.v = 0; qbMount(); }
    else if ((t = e.target.closest("[data-qb-v]"))) { qb.v = +t.getAttribute("data-qb-v"); qbMount(); }
    else if ((t = e.target.closest("[data-qb-n]"))) { qb.n = Math.max(1, Math.min(12, qb.n + +t.getAttribute("data-qb-n"))); qbMount(); }
    else if ((t = e.target.closest("[data-qb-plan]"))) { qb.plan = t.getAttribute("data-qb-plan"); qbMount(); }
    else if ((t = e.target.closest("[data-qb-add]")) || (t = e.target.closest("[data-qb-cr]"))) {
      var item;
      if (t.hasAttribute("data-qb-cr")) item = { id: QB.creatine.id, quantity: 1 };
      else {
        var prod = QB.products[qb.p], v = prod.variants[qb.v] || prod.variants[0];
        item = { id: v.id, quantity: qb.n };
        var sp = qb.plan === "q3" ? prod.quarterly : qb.plan === "sub" ? prod.monthly : null; if (sp) item.selling_plan = +sp;
      }
      t.disabled = true; t.textContent = "Adding…";
      post(FF.routes.cartAdd, { items: [item] })
        .then(function () { if (document.querySelector("[data-cart-page]")) location.reload(); else refreshCart(); })
        .catch(function (x) { toast(x.message || "Could not add to your box."); qbMount(); });
    }
  });

  function progressHtml(n, sub) {
    var ship = FF.freeShipAt || 2, cre = FF.creatineAt || 3, t = FF.text || {};
    if (sub == null) sub = n;
    var msg = n === 0 ? (t.empty || "") : n < ship ? (t.perk1 || "") : sub < cre ? (t.perk2 || "") : (t.done || "");
    var pct = Math.min(1, Math.max(n / ship * 0.5, sub / cre));
    return '<div class="progress"><div class="progress__msg">' + esc(msg) + '</div><div class="progress__track"><div class="progress__fill" style="transform:scaleX(' + pct + ')"></div></div></div>';
  }
  function setCount(n) { $$("[data-count]").forEach(function (c) { c.textContent = n; c.classList.remove("bump"); void c.offsetWidth; c.classList.add("bump"); }); }

  function renderCart(cart) {
    var body = $("[data-cart-body]"), foot = $("[data-cart-foot]");
    if (!body) return;
    var packs = (cart.items || []).reduce(function (a, it) { return a + (isCreatine(it) ? 0 : it.quantity); }, 0);
    setCount(cart.item_count);
    if (!cart.item_count) {
      var qbh = qbHtml();
      body.innerHTML = qbh ? '<div data-qb-slot>' + qbh + '</div>' : progressHtml(0) + '<div class="empty"><b>' + esc((FF.text && FF.text.empty) || "Your box is empty.") + '</b></div><div style="display:grid;gap:10px"><a class="btn btn--money" href="/products/everyday">Shop Everyday</a><a class="btn btn--ghost" href="/products/energy">Shop Energy</a></div>';
      foot.innerHTML = ""; return;
    }
    var lines = cart.items.map(function (it, i) {
      if (isCreatine(it)) {
        var cimg = it.image ? '<img src="' + esc(it.image + (it.image.indexOf('?') > -1 ? '&' : '?') + 'width=160') + '" alt="" loading="lazy">' : "";
        return '<div class="cart-line cart-line--gift"><div class="pack">' + cimg + '</div><div><b>Free Creatine For Life of Subscription</b><small>' + esc((FF.text && FF.text.creatine) || "Free with 3+ subscription packs") + '</small></div><div class="cart-line__price">FREE</div></div>';
      }
      if (isUpsell(it)) {
        var uimg = it.image ? '<img src="' + esc(it.image + (it.image.indexOf('?') > -1 ? '&' : '?') + 'width=160') + '" alt="" loading="lazy">' : "";
        var ustrike = it.original_line_price > it.final_line_price ? "<s>" + money(it.original_line_price) + "</s>" : "";
        return '<div class="cart-line cart-line--gift" data-line="' + (i + 1) + '"><div class="pack">' + uimg + '</div><div><b>2nd creatine bag</b><small>Every 3 months \u00b7 ' + UP.pct + '% off</small><br><button type="button" class="linkish" data-dec aria-label="Remove 2nd creatine bag">Remove</button><output hidden>1</output></div><div class="cart-line__price">' + ustrike + money(it.final_line_price) + '</div></div>';
      }
      var plan = it.selling_plan_allocation ? planLabel(it.selling_plan_allocation.selling_plan.name) : "One-time";
      var img = it.image ? '<img src="' + esc(it.image + (it.image.indexOf('?') > -1 ? '&' : '?') + 'width=160') + '" alt="" loading="lazy">' : "";
      var strike = it.original_line_price > it.final_line_price ? "<s>" + money(it.original_line_price) + "</s>" : "";
      return '<div class="cart-line" data-line="' + (i + 1) + '"><div class="pack">' + img + '</div>' +
        '<div><b>' + esc(shortTitle(it.product_title)) + '</b><small>' + esc(flavorName(it.variant_title || "")) + ' \u00b7 ' + esc(plan) + '</small><br>' +
        '<div class="qty"><button type="button" data-dec aria-label="Remove one">&minus;</button><output class="num">' + it.quantity + '</output><button type="button" data-inc aria-label="Add one">+</button></div></div>' +
        '<div class="cart-line__price">' + strike + money(it.final_line_price) + '</div></div>';
    }).join("");
    var offer = "";
    if (UP && quarterlyFree(cart) && !(cart.items || []).some(isUpsell)) {
      var was = UP.price, now = Math.round(UP.price * (100 - UP.pct) / 100);
      offer = '<div class="upsell"><div><b>Add a 2nd creatine bag, ' + UP.pct + '% off</b><small>One pouch is 45 servings. A 2nd bag covers your full 90 days, every 3 months.</small></div>' +
        '<button type="button" class="btn btn--ghost upsell__btn" data-upsell-add>Add <s>' + money(was) + '</s> ' + money(now) + '</button></div>';
    }
    body.innerHTML = progressHtml(packs, subCount(cart).n) + lines + offer;
    var saved = cart.original_total_price - cart.total_price;
    foot.innerHTML =
      (saved > 0 ? '<div class="total-row total-row--save"><span>You save</span><span>&minus;' + money(saved) + '</span></div>' : "") +
      '<div class="total-row total-row--big"><span>Subtotal</span><span>' + money(cart.total_price) + '</span></div>' +
      '<a class="btn btn--money btn--block" href="' + esc(FF.routes.checkout) + '" style="margin-top:12px">Checkout ' + money(cart.total_price) + '</a>' +
      '<p class="legal">Taxes and shipping calculated at checkout. Subscriptions renew at the price shown until you cancel; skip or cancel anytime in your account.</p>';
  }
  function settle(cart) {
    return syncCreatine(cart).then(function (r) {
      var had = (cart.items || []).some(isCreatine);
      if (r.changed && r.upOnly) toast("2nd creatine bag removed: it comes with Every 3 months.");
      else if (r.changed && r.added && !had) toast("Free Creatine For Life of Subscription added to your box.");
      if (r.changed && !r.added && had) toast("Free Creatine For Life of Subscription needs 3 or more subscription packs.");
      renderCart(r.cart); return r;
    });
  }
  function refreshCart() { return getCart().then(settle).then(function (r) { return r.cart; }); }
  function changeLine(line, qty) {
    return post(FF.routes.cartChange, { line: line, quantity: qty }).then(settle)
      .catch(function () { toast("Could not update your box. Try again."); });
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-upsell-add]"); if (!b || !UP) return;
    b.disabled = true; b.textContent = "Adding\u2026";
    post(FF.routes.cartAdd, { items: [{ id: +UP.id, quantity: 1, selling_plan: +UP.plan, properties: { _ff_upsell: "creatine-2nd-bag" } }] })
      .then(getCart).then(settle).then(function () { toast("2nd creatine bag added."); if (document.querySelector("[data-cart-page]")) location.reload(); })
      .catch(function () { toast("Could not add the 2nd bag. Try again."); refreshCart(); });
  });
  // Keep the cart right on every page load, including /cart and carts filled elsewhere.
  getCart().then(function (c) {
    if (!c.item_count) return;
    return settle(c).then(function (r) { if (r.changed && document.querySelector("[data-cart-page]")) location.reload(); });
  }).catch(function () {});
  document.addEventListener("click", function (e) {
    var line = e.target.closest(".cart-line[data-line]"); if (!line) return;
    var q = +$("output", line).textContent, n = +line.dataset.line;
    if (e.target.closest("[data-inc]")) changeLine(n, q + 1);
    if (e.target.closest("[data-dec]")) changeLine(n, q - 1);
  });

  // ---------- Product buy box ----------
  var pd = $("[data-product]"), dataEl = $("[data-product-json]");
  if (pd && dataEl) {
    var P = JSON.parse(dataEl.textContent);
    var V = {}; P.variants.forEach(function (v) { V[v.id] = v; });
    var MAXQ = 24;
    var hasSub = !!$('[data-pp] [data-v="sub"]', pd);
    var st = { plan: hasSub ? "sub" : "otp", q: {} };
    $$("[data-fq]", pd).forEach(function (row) { st.q[row.dataset.fq] = +$("input", row).value || 0; });
    var total = function () { return Object.keys(st.q).reduce(function (a, k) { return a + st.q[k]; }, 0); };
    var tierRate = function (n) { return n >= 2 ? 0.15 : 0.10; };
    var OTP_MULTI = 0.15, SHIP_OTP = 599;

    // Unit price in cents for a variant on a plan, from Shopify's selling plan allocations.
    // Each variant carries its own product's plan ids, so Everyday and Energy can share one order.
    function planId(v, plan) { var id = plan === "q3" ? v.quarterly : plan === "sub" ? v.monthly : null; return id ? String(id) : null; }
    function unit(v, plan, n) {
      if (plan === "otp") return n >= 2 ? Math.round(v.price * (1 - OTP_MULTI)) : v.price;
      if (plan === "sub" && P.volumeTiers) return Math.round(v.price * (1 - tierRate(n)));
      var id = planId(v, plan);
      return id && v.plans[id] != null ? v.plans[id] : v.price;
    }

    function draw() {
      var n = total(), full = 0, tot = 0;
      Object.keys(st.q).forEach(function (id) { var v = V[id], k = st.q[id]; full += v.price * k; tot += unit(v, st.plan, n) * k; });
      var save = full - tot;
      // Stage
      var shown = 0;
      $$("[data-stack]", pd).forEach(function (fig) { var k = st.q[fig.dataset.stack] || 0; fig.classList.toggle("is-out", !k); $(".pd__count", fig).textContent = "\u00d7" + k; if (k) shown++; });
      var stack = $("[data-pd-stack]", pd); if (stack) stack.setAttribute("data-n", shown);
      // Rows
      $$("[data-fq]", pd).forEach(function (row) {
        var id = row.dataset.fq, k = st.q[id], v = V[id], inp = $("input", row);
        if (document.activeElement !== inp) inp.value = k;
        $('[data-step="-1"]', row).disabled = k <= 0 || n <= 1;
        $('[data-step="1"]', row).disabled = n >= MAXQ || !v.available;
        row.classList.toggle("is-zero", k === 0);
        $("[data-fq-sub]", row).textContent = k ? k + (k === 1 ? " pack \u00b7 " : " packs \u00b7 ") + money(unit(v, st.plan, n) * k) : (v.available ? "Not in this order" : "Sold out");
      });
      // Plan toggle and prices
      $$("[data-pp] button", pd).forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.v === st.plan)); });
      $$("[data-plan-price]", pd).forEach(function (el) {
        var plan = el.dataset.planPrice, sum = 0;
        var ids = Object.keys(st.q).filter(function (id) { return st.q[id] > 0; });
        if (ids.length) ids.forEach(function (id) { sum += unit(V[id], plan, n) * st.q[id]; });
        else sum = unit(V[Object.keys(st.q)[0]], plan, 1);
        el.textContent = money(sum);
      });
      // Shipping: subscriptions always ship free; one-time ships free from 2 packs, otherwise $5.99.
      var freeShip = st.plan !== "otp" || n >= 2, shipCost = freeShip ? 0 : SHIP_OTP;
      var ship = st.plan !== "otp" ? "Free Shipping on every delivery." : n >= 2 ? "Free Shipping on this order." : "Shipping " + money(SHIP_OTP) + ", free from 2 packs.";
      var creAt = FF.creatineAt || 3, creOn = st.plan !== "otp" && n >= creAt;
      var cre = creOn ? "Free Creatine For Life of Subscription included." : "Free Creatine For Life of Subscription with " + creAt + " or more packs" + (n ? " (add " + (creAt - n) + " more)." : ".");
      var note = st.plan === "q3" ? "<b>Every 3 months:</b> ships every 90 days, any number of packs, " + P.quarterlyPct + "% off. " + cre + " Skip or cancel online anytime. " + ship
        : st.plan === "sub" ? "<b>Monthly:</b> " + (P.volumeTiers ? "10% off 1 pack, 15% off 2 or more" : P.monthlyPct + "% off") + ", ships every 30 days. " + cre + " Skip or cancel online anytime. " + ship
        : "<b>One-time:</b> one delivery, no subscription. 15% off 2 or more packs. " + ship;
      $("[data-plan-note]", pd).innerHTML = note;
      // Savings bar
      var on1 = st.plan !== "otp", on2 = n >= 2, on3 = st.plan === "q3";
      $$("[data-tier]", pd).forEach(function (t) { var k = +t.dataset.tier; var on = k === 1 ? on1 : k === 2 ? on2 : on3; t.classList.toggle("is-on", on); t.classList.toggle("is-next", !on && (k === 2 ? on1 : k === 3 ? on1 && on2 : true)); });
      var tm = $("[data-tiers-msg]", pd);
      if (tm) tm.innerHTML = st.plan === "otp" ? "Savings and Free Creatine For Life of Subscription come with a subscription."
        : !creOn ? "Add " + (creAt - n) + " more " + (creAt - n === 1 ? "pack" : "packs") + " for <b>Free Creatine For Life of Subscription</b>."
        : st.plan === "q3" ? "<b>Best value unlocked:</b> " + P.quarterlyPct + "% off and Free Creatine For Life of Subscription." : "Free Creatine For Life of Subscription unlocked. Switch to <b>Every 3 months</b> for " + P.quarterlyPct + "% off.";
      // Receipt
      var rc = $("[data-pd-receipt]", pd), html = "";
      Object.keys(st.q).forEach(function (id) { if (st.q[id]) html += '<li class="item"><span class="item__name">' + st.q[id] + "\u00d7 " + esc((V[id].formula ? V[id].formula + " " : "") + flavorName(V[id].title)) + '</span><span class="item__lead"></span><span class="item__val">' + money(V[id].price * st.q[id]) + "</span></li>"; });
      if (save > 0) html += '<li class="item item--save"><span class="item__name">' + (st.plan === "otp" ? "2+ pack savings" : "Subscription savings") + '</span><span class="item__lead"></span><span class="item__val">&minus;' + money(save) + "</span></li>";
      if (creOn) html += '<li class="item item--add"><span class="item__name">Free Creatine For Life of Subscription</span><span class="item__lead"></span><span class="item__val">FREE</span></li>';
      html += '<li class="item"><span class="item__name">Shipping</span><span class="item__lead"></span><span class="item__val">' + (freeShip ? "FREE" : money(shipCost)) + "</span></li>";
      rc.innerHTML = html;
      $("[data-pd-receipt-meta]", pd).textContent = st.plan === "q3" ? "Every 3 months" : st.plan === "sub" ? "Monthly" : "One-time";
      $("[data-pd-price]", pd).innerHTML = (save > 0 ? "<s>" + money(full + shipCost) + "</s>" : "") + money(tot + shipCost);
      var sv = $("[data-pd-save]", pd); sv.textContent = save > 0 ? "You save " + money(save) : ""; sv.hidden = !(save > 0);
      var perk = $("[data-pd-perk]", pd); if (perk) perk.textContent = freeShip ? "Free Shipping" : "Free Shipping at 2+";
      var add = $("[data-pd-add]", pd); add.disabled = n < 1; add.textContent = n ? "Add " + n + (n === 1 ? " pack" : " packs") + " \u00b7 " + money(tot) : "Choose a flavor";
    }

    pd.addEventListener("click", function (e) {
      var b = e.target.closest("[data-fq] [data-step]");
      if (b && !b.disabled) { var id = b.closest("[data-fq]").dataset.fq; st.q[id] = Math.max(0, st.q[id] + +b.dataset.step); draw(); }
      var p = e.target.closest("[data-pp] button");
      if (p) {
        st.plan = p.dataset.v;
        draw();
      }
    });
    $$("[data-fq] input", pd).forEach(function (inp) {
      var id = inp.closest("[data-fq]").dataset.fq;
      inp.addEventListener("input", function () { var k = parseInt(inp.value, 10); if (k >= 0) { var others = total() - st.q[id]; st.q[id] = Math.min(MAXQ - others, k); draw(); } });
      inp.addEventListener("blur", function () { inp.value = st.q[id]; });
    });
    var form = $("[data-ff-form]", pd);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var items = [], err = $("[data-pd-error]", pd);
      Object.keys(st.q).forEach(function (id) { if (st.q[id] > 0) { var it = { id: +id, quantity: st.q[id] }, sp = planId(V[id], st.plan); if (sp) it.selling_plan = +sp; items.push(it); } });
      if (!items.length) return;
      var btn = $("[data-pd-add]", pd); btn.disabled = true; btn.textContent = "Adding\u2026"; err.hidden = true;
      fetch(FF.routes.cartAdd, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ items: items }) })
        .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.description || j.message || "Could not add to your box."); return j; }); })
        .then(function () { draw(); openCart(); })
        .catch(function (x) { err.textContent = x.message; err.hidden = false; draw(); });
    });
    draw();
  }

  // Fruit settles behind a pouch while its back shows; white powder bursts on each turn.
  function burstTurn(b, back) {
    if (!b) return;
    b.classList.toggle("is-fruit", back);
    b.classList.remove("is-pop"); void b.offsetWidth; b.classList.add("is-pop");
  }

  // ---------- Hero 3D pouches: lean toward the pointer, drag or press to turn over ----------
  $$("[data-hx-stage]").forEach(function (stage) {
    var scene = $("[data-hx-scene]", stage), turnBtn = $("[data-hx-turn]", stage), turnLabel = $("[data-hx-turn-label]", stage);
    var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    var packs = $$("[data-hx-pack]", stage).map(function (el) {
      var bag = $("[data-bag3d]", el), spinEl = $("[data-hx-spin]", el);
      var rest = parseFloat(getComputedStyle(el).getPropertyValue("--rest")) || 0;
      return { el: el, bag: bag, spinEl: spinEl, rest: rest, spin: 0, raf: 0, back: false, burst: $("[data-burst]", el) };
    });
    function apply(pk) {
      pk.spinEl.style.setProperty("--spin", pk.spin.toFixed(2) + "deg");
      var back = Math.cos((pk.rest + pk.spin) * Math.PI / 180) < 0;
      if (pk.bag) pk.bag.classList.toggle("show-back", back);
      if (back !== pk.back) { pk.back = back; burstTurn(pk.burst, back); }
    }
    function ease(t) { return 1 - Math.pow(1 - t, 3); }
    // Turn a pouch to an angle; the face swaps exactly when the pouch passes edge-on.
    function tween(pk, to, ms) {
      cancelAnimationFrame(pk.raf);
      if (reduce || !ms) { pk.spin = to; apply(pk); return; }
      var from = pk.spin, t0 = performance.now();
      (function step(now) {
        var t = Math.min(1, (now - t0) / ms);
        pk.spin = from + (to - from) * ease(t); apply(pk);
        if (t < 1) pk.raf = requestAnimationFrame(step);
      })(t0);
    }
    function showingBack(pk) { return Math.cos((pk.rest + pk.spin) * Math.PI / 180) < 0; }
    function syncButton() {
      if (!turnBtn) return;
      var back = packs.length && packs.every(showingBack);
      turnBtn.setAttribute("aria-pressed", String(back));
      if (turnLabel) turnLabel.textContent = back ? "Turn it back" : "Turn it over";
    }
    if (turnBtn) turnBtn.addEventListener("click", function () {
      var toBack = !packs.every(showingBack);
      packs.forEach(function (pk, i) {
        var target = (toBack ? 180 : 0) + Math.round(pk.spin / 360) * 360;
        setTimeout(function () { tween(pk, target, 950); }, i * 120);
      });
      setTimeout(syncButton, 1200);
      if (turnLabel) turnLabel.textContent = toBack ? "Turn it back" : "Turn it over";
      turnBtn.setAttribute("aria-pressed", String(toBack));
    });

    // Drag a pouch sideways to turn it; it settles on the nearest face.
    packs.forEach(function (pk) {
      var startX = 0, base = 0, drag = false, id = null;
      pk.el.addEventListener("pointerdown", function (e) {
        if (e.button !== 0) return;
        drag = true; id = e.pointerId; startX = e.clientX; base = pk.spin;
        cancelAnimationFrame(pk.raf); pk.el.classList.add("is-drag");
        try { pk.el.setPointerCapture(id); } catch (x) {}
      });
      pk.el.addEventListener("pointermove", function (e) {
        if (!drag || e.pointerId !== id) return;
        pk.spin = base + (e.clientX - startX) * .55; apply(pk);
      });
      function end(e) {
        if (!drag || (e && e.pointerId !== id)) return;
        drag = false; pk.el.classList.remove("is-drag");
        var total = pk.rest + pk.spin, snapped = Math.round(total / 180) * 180;
        tween(pk, snapped - pk.rest, 650);
        setTimeout(syncButton, 700);
      }
      pk.el.addEventListener("pointerup", end);
      pk.el.addEventListener("pointercancel", end);
    });

    // Lean toward the pointer (mouse and trackpad only).
    if (!reduce && scene && window.matchMedia && matchMedia("(hover: hover) and (pointer: fine)").matches) {
      var tx = 0, ty = 0, cx = 0, cy = 0, run = false;
      function loop() {
        cx += (tx - cx) * .08; cy += (ty - cy) * .08;
        scene.style.setProperty("--ry", cx.toFixed(2) + "deg");
        scene.style.setProperty("--rx", cy.toFixed(2) + "deg");
        if (Math.abs(tx - cx) > .02 || Math.abs(ty - cy) > .02) requestAnimationFrame(loop); else run = false;
      }
      function kick() { if (!run) { run = true; requestAnimationFrame(loop); } }
      stage.addEventListener("pointermove", function (e) {
        var r = stage.getBoundingClientRect();
        tx = ((e.clientX - r.left) / r.width - .5) * 14;
        ty = -((e.clientY - r.top) / r.height - .5) * 8;
        kick();
      });
      stage.addEventListener("pointerleave", function () { tx = 0; ty = 0; kick(); });
    }
    packs.forEach(apply);
  });

  // ---------- Label rows highlight as the page scrolls ----------
  $$("[data-hl-section]").forEach(function (sec) {
    var rows = $$("[data-hl]", sec), on = false, ticking = false;
    if (!rows.length) return;
    function frame() {
      ticking = false;
      // Rows light one at a time across the section's scroll, in reading order.
      var vh = window.innerHeight, rc = sec.getBoundingClientRect();
      var prog = Math.min(1, Math.max(0, (vh * .8 - rc.top) / Math.max(1, rc.height + vh * .1)));
      var cur = Math.round(prog * rows.length) - 1;
      rows.forEach(function (r, i) { r.classList.toggle("is-read", i <= cur); r.classList.toggle("is-on", i === cur); });
    }
    function req() { if (on && !ticking) { ticking = true; requestAnimationFrame(frame); } }
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) { on = es[0].isIntersecting; req(); }, { rootMargin: "20% 0px 20% 0px" }).observe(sec);
    } else { on = true; }
    window.addEventListener("scroll", req, { passive: true });
    window.addEventListener("resize", req);
    req();
  });

  // ---------- Promise checklist: wavy line draws, checks tick in ----------
  $$("[data-check-section]").forEach(function (sec) {
    var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window)) return;
    sec.classList.add("js-check");
    var io = new IntersectionObserver(function (es) {
      if (es[0].isIntersecting) { sec.classList.add("is-in"); io.disconnect(); }
    }, { threshold: .35 });
    io.observe(sec);
  });

  // ---------- Label section: sticks slide in and spill salt, once ----------
  $$("[data-spill]").forEach(function (sec) {
    var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    return; // scroll-linked now (see [data-sp])
    sec.classList.add("js-spill");
    var io = new IntersectionObserver(function (es) {
      if (es[0].isIntersecting) { sec.classList.add("is-spilled"); io.disconnect(); }
    }, { threshold: .2 });
    io.observe(sec);
  });

  // ---------- Scroll progress for [data-sp]: --sp goes 0 to 1 as the element crosses the screen ----------
  (function () {
    var els = $$("[data-sp]");
    var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!els.length || reduce) return;
    var ticking = false;
    function frame() {
      ticking = false;
      var vh = window.innerHeight;
      els.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.bottom < -100 || r.top > vh + 100) return;
        var p = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));
        el.style.setProperty("--sp", p.toFixed(4));
      });
    }
    function req() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
    window.addEventListener("scroll", req, { passive: true });
    window.addEventListener("resize", req);
    frame();
  })();

  // ---------- Signature writes itself when it comes into view ----------
  $$("[data-sig]").forEach(function (sig) {
    var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window)) return;
    sig.classList.add("js-sig");
    var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { sig.classList.add("is-in"); io.disconnect(); } }, { threshold: .6 });
    io.observe(sig);
  });

  // ---------- Story light box ----------
  $$("[data-story-open]").forEach(function (btn) {
    var dlg = btn.closest("section") && $("[data-story]", btn.closest("section"));
    if (!dlg || !dlg.showModal) return;
    function close() { dlg.close(); }
    btn.addEventListener("click", function () { dlg.showModal(); document.documentElement.classList.add("story-open"); });
    dlg.addEventListener("close", function () { document.documentElement.classList.remove("story-open"); btn.focus(); });
    dlg.addEventListener("click", function (e) { if (e.target === dlg || e.target.closest("[data-story-close]")) close(); });
  });

  // ---------- Creatine page: turn the pouch, one-time buy ----------
  $$("[data-cr-stage]").forEach(function (st) {
    var flip = $("[data-cr-flip]", st), btn = $("[data-cr-turn]", st), lab = $("[data-cr-turn-label]", st);
    if (btn && flip) btn.addEventListener("click", function () {
      var back = flip.classList.toggle("is-back");
      btn.setAttribute("aria-pressed", String(back)); if (lab) lab.textContent = back ? "See the front" : "Read the back";
    });
  });
  $$("[data-cr-add]").forEach(function (btn) {
    var box = btn.closest(".cr-box"), inp = $("input", box), err = $("[data-cr-error]", box), price = +btn.getAttribute("data-price");
    function q() { return Math.max(1, Math.min(12, parseInt(inp.value, 10) || 1)); }
    function label() { if (!btn.disabled) btn.textContent = "Add " + q() + (q() === 1 ? " pouch" : " pouches") + " · " + money(price * q()); }
    box.addEventListener("click", function (e) { var s = e.target.closest("[data-step]"); if (!s) return; inp.value = q() + +s.getAttribute("data-step"); inp.value = q(); label(); });
    inp.addEventListener("input", label);
    btn.addEventListener("click", function () {
      btn.disabled = true; btn.textContent = "Adding…"; err.hidden = true;
      post(FF.routes.cartAdd, { items: [{ id: +btn.getAttribute("data-variant"), quantity: q() }] })
        .then(function () { btn.disabled = false; label(); openCart(); })
        .catch(function (x) { btn.disabled = false; label(); err.textContent = x.message; err.hidden = false; });
    });
    label();
  });

  // ---------- Rotating hero ----------
  $$("[data-hero-rotate]").forEach(function (hero) {
    var slides = $$("[data-hero-slide]", hero), dots = $$("[data-hero-dot]", hero), pauseBtn = $("[data-hero-pause]", hero);
    if (slides.length < 2) return;
    var secs = Math.max(4, +hero.getAttribute("data-hero-rotate") || 7), cur = 0, timer = null;
    var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    var userPaused = reduce, hover = false, focus = false, held = false, heldT = null;
    hero.style.setProperty("--hero-t", secs + "s");
    function setPauseLabel() {
      if (!pauseBtn) return;
      pauseBtn.setAttribute("aria-pressed", String(userPaused));
      pauseBtn.setAttribute("aria-label", userPaused ? "Play rotation" : "Pause rotation");
    }
    function show(i) {
      cur = (i + slides.length) % slides.length;
      slides.forEach(function (s, k) {
        var on = k === cur;
        s.classList.toggle("is-active", on);
        if (on) { s.removeAttribute("aria-hidden"); s.inert = false; } else { s.setAttribute("aria-hidden", "true"); s.inert = true; }
        $$("a, button", s).forEach(function (a) { if (on) a.removeAttribute("tabindex"); else a.setAttribute("tabindex", "-1"); });
      });
      dots.forEach(function (d, k) { if (k === cur) d.setAttribute("aria-current", "true"); else d.removeAttribute("aria-current"); });
      restart();
    }
    function playing() { return !userPaused && !hover && !focus && !held && !document.hidden; }
    function restart() {
      clearTimeout(timer);
      hero.classList.remove("is-playing");
      if (!playing()) return;
      void hero.offsetWidth;
      hero.classList.add("is-playing");
      timer = setTimeout(function () { show(cur + 1); }, secs * 1000);
    }
    dots.forEach(function (d) { d.addEventListener("click", function () { show(+d.getAttribute("data-hero-dot")); }); });
    if (pauseBtn) {
      setPauseLabel();
      pauseBtn.addEventListener("click", function () { userPaused = !userPaused; setPauseLabel(); restart(); });
    }
    var box = $(".p-hero__slides", hero);
    if (window.matchMedia && matchMedia("(hover: hover)").matches) {
      box.addEventListener("mouseenter", function () { hover = true; restart(); });
      box.addEventListener("mouseleave", function () { hover = false; restart(); });
    }
    box.addEventListener("pointerdown", function () { held = true; restart(); clearTimeout(heldT); heldT = setTimeout(function () { held = false; restart(); }, 9000); });
    box.addEventListener("focusin", function () { focus = true; restart(); });
    box.addEventListener("focusout", function (e) { if (!box.contains(e.relatedTarget)) { focus = false; restart(); } });
    document.addEventListener("visibilitychange", restart);
    show(0);
  });

  // ---------- 3D pouch turn (scroll) ----------
  // Front, then turn to the back, then zoom into the ingredient list.
  $$("[data-turn]").forEach(function (sec) {
    var bag = $("[data-turn-bag]", sec), zoom = $("[data-turn-zoom]", sec), card = $("[data-turn-card]", sec);
    var bar = $("[data-turn-bar]", sec), floor = $("[data-turn-floor]", sec), stage = $(".turn__stage", sec), plate = $("[data-turn-plate]", sec);
    var steps = $$("[data-turn-step]", sec), tBurst = $("[data-burst]", sec), tBack = false;
    if (!bag || !zoom) return;
    var wIn = +sec.getAttribute("data-width") || 7.5, dIn = +sec.getAttribute("data-depth") || 1;
    // Ingredient block on the back render, as fractions of the pouch face.
    var IU = 0.188, IV = 0.79, IW = 0.25;
    function geom() {
      var bw = bag.offsetWidth, bh = bag.offsetHeight, d = bw * dIn / wIn;
      var th = Math.asin(Math.min(1, (d / 2) / bh)) * 180 / Math.PI;
      bag.style.setProperty("--d", d.toFixed(1) + "px");
      bag.style.setProperty("--th", th.toFixed(3) + "deg");
      sec.style.setProperty("--bw", bw + "px");
      sec.style.setProperty("--bh", bh + "px");
    }
    var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { geom(); bag.classList.add("show-back"); return; }
    sec.classList.add("turn--live");
    geom();
    function clamp(x, a, b) { return Math.min(b, Math.max(a, x)); }
    function seg(p, a, b) { return clamp((p - a) / (b - a), 0, 1); }
    function ease(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
    var ticking = false, lastStep = -1, cur = -1;
    function frame() {
      ticking = false;
      var r = sec.getBoundingClientRect(), total = sec.offsetHeight - window.innerHeight;
      if (r.bottom < -50 || r.top > window.innerHeight + 50) { cur = -1; return; }
      var target = clamp(-r.top / Math.max(1, total), 0, 1);
      // Ease toward the scroll position so a fast flick still shows the turn.
      cur = cur < 0 ? target : cur + (target - cur) * .16;
      if (Math.abs(target - cur) < .0015) cur = target; else req();
      var p = cur;
      var turn = ease(seg(p, .06, .46)), z = ease(seg(p, .6, .88));
      var a = -24 + 204 * turn, tilt = 7 * (1 - ease(seg(p, .4, .58)));
      bag.style.transform = "rotateX(" + tilt.toFixed(2) + "deg) rotateY(" + a.toFixed(2) + "deg)";
      var isBack = Math.cos(a * Math.PI / 180) < 0;
      bag.classList.toggle("show-back", isBack);
      if (isBack !== tBack) { tBack = isBack; burstTurn(tBurst, isBack); }
      var bw = bag.offsetWidth, bh = bag.offsetHeight, sw = stage.clientWidth, sh = stage.clientHeight;
      var small = window.innerWidth <= 860;
      var targetW = Math.min(sw * (small ? .86 : .62), 560);
      var Z = Math.max(1, targetW / (IW * bw)), S = 1 + (Z - 1) * z;
      var dx = (IU - .5) * bw, dy = (IV - .5) * bh;
      var gx = 0, gy = -sh * (small ? .33 : .1);
      var tx = z * (gx - dx * S), ty = z * (gy - dy * S);
      zoom.style.transform = "translate3d(" + tx.toFixed(1) + "px," + ty.toFixed(1) + "px,0) scale(" + S.toFixed(3) + ")";
      // Zoom on a flat, full-size copy of the back so the label text stays sharp.
      var usePlate = !!plate && p >= .58;
      sec.classList.toggle("is-plate", usePlate);
      if (plate) {
        plate.style.width = (bw * Z).toFixed(1) + "px";
        plate.style.height = (bh * Z).toFixed(1) + "px";
        plate.style.transform = "translate(-50%,-50%) translate3d(" + tx.toFixed(1) + "px," + ty.toFixed(1) + "px,0) scale(" + (S / Z).toFixed(4) + ")";
      }
      if (floor) floor.style.opacity = String(1 - z);
      if (bar) bar.style.transform = "scaleX(" + p.toFixed(3) + ")";
      var st = p < .36 ? 0 : p < .66 ? 1 : 2;
      if (st !== lastStep) { lastStep = st; steps.forEach(function (li, k) { li.classList.toggle("is-on", k === st); }); }
      if (card) card.classList.toggle("is-on", p > .8);
    }
    function req() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
    window.addEventListener("scroll", req, { passive: true });
    window.addEventListener("resize", function () { geom(); req(); });
    $$("img", bag).forEach(function (im) { if (!im.complete) im.addEventListener("load", req); });
    frame();
  });

  // ---------- Subscription demo (home) ----------
  var ui = $("[data-sub-ui]");
  if (ui) {
    var msgs = { skip: "Next box skipped.", swap: "Swapped organic flavors for the next box.", pause: "Paused. Restart from your account whenever you like.", gift: "Your next box ships to someone else, with your note." };
    ui.addEventListener("click", function (e) { var b = e.target.closest("[data-act]"); if (!b) return; $$("[data-act]", ui).forEach(function (x) { x.classList.toggle("is-on", x === b); }); $("[data-ui-toast]", ui).textContent = msgs[b.dataset.act]; });
  }

  // ---------- Scroll reveal ----------
  if ("IntersectionObserver" in window && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    var els = $$("main .sec .wrap > *, main .sec-head > *, .p-formulas > *, .p-tiers > *, .p-promise > *, .p-proof > *, .faq details");
    els.forEach(function (el) { el.setAttribute("data-reveal", ""); var i = el.parentElement ? Array.prototype.indexOf.call(el.parentElement.children, el) : 0; el.style.setProperty("--ri", Math.min(i, 5)); });
    document.documentElement.classList.add("reveal-on");
    var io = new IntersectionObserver(function (en) { en.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add("is-in"); io.unobserve(x.target); } }); }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    $$("[data-reveal]").forEach(function (el) { io.observe(el); });
  }

  qbMount();
  if (drawer) refreshCart().catch(function () {});
})();
