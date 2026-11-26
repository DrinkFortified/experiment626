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
  function flavorName(t) { if (!t || /^default title$/i.test(t)) return "Unflavored"; return t.replace(/^Organic\s+/i, ""); }

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

  // ---------- Free creatine ----------
  // 1 free creatine is kept in the cart while it holds FF.creatineAt or more subscription
  // packs, on the plan matching the packs' delivery frequency, and removed below that.
  var CR = FF.creatine || null, UP = FF.upsell || null;
  // Only the free gift line counts: it carries _ff_gift or a selling plan. A one-time pouch
  // bought from the creatine page is a normal line and is never touched.
  function lineProps(it) { return it.properties || {}; }
  function isCreatine(it) { return !!CR && +it.variant_id === +CR.id && (!!lineProps(it)._ff_gift || !!it.selling_plan_allocation); }
  // 2nd creatine bag: offered on Every 3 months while the free bag is quarterly, max 1.
  function isUpsell(it) { return !!UP && +it.variant_id === +UP.id && (!!lineProps(it)._ff_upsell || (!!it.selling_plan_allocation && String(it.selling_plan_allocation.selling_plan.id) === String(UP.plan))); }
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

  // ---------- Quick buy in an empty cart: formula, flavor, packs, plan, plus one-time creatine ----------
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
    h += '<p class="qb__h">Build your box</p><p class="qb__sub">Pick a formula, a flavor and how often.</p>';
    h += '<div><p class="qb__label">Formula</p><div class="qb__pills">' + QB.products.map(function (pp, i) { return '<button type="button" class="qb__pill qb__pill--plain" data-qb-p="' + i + '" aria-pressed="' + (i === qb.p) + '">' + esc(pp.label) + '</button>'; }).join("") + '</div></div>';
    h += '<div><p class="qb__label">Flavor</p><div class="qb__pills">' + prod.variants.map(function (vv, i) { return '<button type="button" class="qb__pill" data-qb-v="' + i + '" aria-pressed="' + (i === qb.v) + '"' + (vv.available ? "" : " disabled") + '>' + (vv.img ? '<img src="' + esc(vv.img) + '" alt="" loading="lazy">' : "") + esc(flavorName(vv.title)) + '</button>'; }).join("") + '</div></div>';
    h += '<div class="qb__row"><p class="qb__label" style="margin:0">Packs</p><div class="stepper stepper--sm"><button type="button" data-qb-n="-1" aria-label="One fewer pack"' + (n <= 1 ? " disabled" : "") + '><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14"/></svg></button><output class="num" aria-live="polite">' + n + '</output><button type="button" data-qb-n="1" aria-label="One more pack"' + (n >= 12 ? " disabled" : "") + '><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></button></div></div>';
    var plans = [["sub", "Monthly"], ["q3", "Every 3 months"], ["otp", "One-time"]].filter(function (x) { return x[0] === "otp" || (x[0] === "sub" ? prod.monthly : prod.quarterly); });
    h += '<div><p class="qb__label">Purchase</p><div class="qb__plans">' + plans.map(function (x) { return '<button type="button" class="qb__plan" data-qb-plan="' + x[0] + '" aria-pressed="' + (x[0] === qb.plan) + '">' + x[1] + '<small>' + money(qbUnit(v, prod, x[0], n) * n) + '</small></button>'; }).join("") + '</div></div>';
    var cre = n >= (FF.creatineAt || 3) && qb.plan !== "otp";
    h += '<p class="qb__note">' + (qb.plan === "otp" ? (n >= 2 ? "15% off and Free Shipping on 2+ packs." : "Shipping $5.99, free from 2 packs.") : (cre ? "Free Shipping, plus free creatine with every delivery." : "Free Shipping. Free creatine from 3 packs.")) + ' Cancel at any time.</p>';
    if (/energy/i.test(prod.label)) h += '<p class="qb__fine"><b>Contains caffeine.</b> Consult your healthcare professional before use, especially if you are pregnant, nursing, taking medication, have a medical condition, or are sensitive to caffeine. Not recommended for children.</p>';
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


  // ---------- Cart upsell: a one-time creatine pouch can become free ----------
  // Shown when the cart holds a one-time creatine pouch and fewer than 3 subscription
  // packs. Adding the packs swaps the paid pouch for the free one (syncCreatine adds it).
  var cu = { p: 0, v: 0, n: 3, plan: "sub" }, cuCart = null;
  function cuOneTime(cart) {
    if (!QB || !QB.creatine) return [];
    return (cart.items || []).filter(function (it) { return +it.variant_id === +QB.creatine.id && !it.selling_plan_allocation && !isCreatine(it) && !isUpsell(it); });
  }
  function cuHtml(cart) {
    if (!cart || !QB || !QB.products || !QB.products.length) return "";
    var ot = cuOneTime(cart), have = subCount(cart).n, at = FF.creatineAt || 3;
    if (!ot.length || have >= at) return "";
    var need = at - have; if (cu.n < need) cu.n = need;
    var prod = QB.products[cu.p], v = prod.variants[cu.v] || prod.variants[0], n = cu.n;
    var paid = ot.reduce(function (a, it) { return a + it.final_line_price; }, 0);
    var h = '<div class="qb qb--cu" data-cu>';
    h += '<p class="qb__h">Get your creatine free</p>';
    h += '<p class="qb__sub">Subscribe to ' + (have ? need + ' more' : at) + ' packs of Everyday or Energy and a pouch of creatine ships free with every delivery. We take the ' + money(paid) + ' one-time pouch off.</p>';
    h += '<div><p class="qb__label">Formula</p><div class="qb__pills">' + QB.products.map(function (pp, i) { return '<button type="button" class="qb__pill qb__pill--plain" data-cu-p="' + i + '" aria-pressed="' + (i === cu.p) + '">' + esc(pp.label) + '</button>'; }).join("") + '</div></div>';
    h += '<div><p class="qb__label">Flavor</p><div class="qb__pills">' + prod.variants.map(function (vv, i) { return '<button type="button" class="qb__pill qb__pill--plain" data-cu-v="' + i + '" aria-pressed="' + (i === cu.v) + '"' + (vv.available ? "" : " disabled") + '>' + esc(vv.title.replace(/^Organic\s+/i, '')) + '</button>'; }).join("") + '</div></div>';
    h += '<div class="qb__row"><p class="qb__label" style="margin:0">Packs</p><div class="stepper stepper--sm"><button type="button" data-cu-n="-1" aria-label="One fewer pack"' + (n <= need ? " disabled" : "") + '>&minus;</button><output class="num">' + n + '</output><button type="button" data-cu-n="1" aria-label="One more pack"' + (n >= 12 ? " disabled" : "") + '>+</button></div></div>';
    var plans = [["sub", "Monthly"], ["q3", "Every 3 months"]].filter(function (x) { return x[0] === "sub" ? prod.monthly : prod.quarterly; });
    if (!plans.length) return "";
    if (!plans.some(function (x) { return x[0] === cu.plan; })) cu.plan = plans[0][0];
    h += '<div><p class="qb__label">How often</p><div class="qb__plans">' + plans.map(function (x) { return '<button type="button" class="qb__plan" data-cu-plan="' + x[0] + '" aria-pressed="' + (x[0] === cu.plan) + '"><span>' + x[1] + '</span><small class="num">' + money(qbUnit(v, prod, x[0], n) * n) + '</small></button>'; }).join("") + '</div></div>';
    h += '<p class="qb__note">Renews automatically ' + (cu.plan === "q3" ? "every 90 days" : "every 30 days") + ' at the price shown until you cancel. Free Shipping. Skip or cancel online anytime.</p>';
    if (/energy/i.test(prod.label)) h += '<p class="qb__fine"><b>Contains caffeine.</b> Consult your healthcare professional before use, especially if you are pregnant, nursing, taking medication, have a medical condition, or are sensitive to caffeine. Not recommended for children.</p>';
    h += '<button type="button" class="btn btn--money btn--block" data-cu-add>Subscribe to ' + n + ' packs · creatine free</button>';
    return h + '</div>';
  }
  function cuMount(cart) {
    if (cart) cuCart = cart;
    var html = cuHtml(cuCart);
    $$("[data-cu-slot], [data-cu-mount]").forEach(function (m) { m.innerHTML = html; m.hidden = !html; });
  }
  document.addEventListener("click", function (e) {
    var root = e.target.closest("[data-cu]"); if (!root || !QB || !cuCart) return;
    var t;
    if ((t = e.target.closest("[data-cu-p]"))) { cu.p = +t.getAttribute("data-cu-p"); cu.v = 0; cuMount(); }
    else if ((t = e.target.closest("[data-cu-v]"))) { cu.v = +t.getAttribute("data-cu-v"); cuMount(); }
    else if ((t = e.target.closest("[data-cu-n]"))) { cu.n = Math.max(1, Math.min(12, cu.n + +t.getAttribute("data-cu-n"))); cuMount(); }
    else if ((t = e.target.closest("[data-cu-plan]"))) { cu.plan = t.getAttribute("data-cu-plan"); cuMount(); }
    else if ((t = e.target.closest("[data-cu-add]"))) {
      var prod = QB.products[cu.p], v = prod.variants[cu.v] || prod.variants[0];
      var sp = cu.plan === "q3" ? prod.quarterly : prod.monthly;
      var ot = cuOneTime(cuCart), upd = {};
      ot.forEach(function (it) { upd[it.key] = 0; });
      t.disabled = true; t.textContent = "Adding…";
      post(FF.routes.cartAdd, { items: [{ id: v.id, quantity: cu.n, selling_plan: +sp }] })
        .then(function () { return Object.keys(upd).length ? post(FF.routes.cartUpdate || "/cart/update.js", { updates: upd }) : null; })
        .then(getCart).then(settle).then(function () {
          toast("Your creatine is now free with your subscription.");
          if (document.querySelector("[data-cart-page]")) location.reload();
        })
        .catch(function (x) { toast((x && x.message) || "Could not update your box."); refreshCart(); });
    }
  });

  // ---------- One-time hydration packs in the cart: offer to switch them to Monthly ----------
  // Switches each one-time Everyday/Energy line in place (cart/change.js with selling_plan),
  // so flavor and quantity stay the same. Prices come from the same rules the buy box uses.
  var cvCart = null;
  function cvFind(id) {
    if (!QB || !QB.products) return null;
    for (var i = 0; i < QB.products.length; i++) {
      var pr = QB.products[i];
      for (var j = 0; j < pr.variants.length; j++) if (+pr.variants[j].id === +id) return { prod: pr, v: pr.variants[j] };
    }
    return null;
  }
  function cvLines(cart) {
    return (cart.items || []).filter(function (it) {
      if (it.selling_plan_allocation || isCreatine(it) || isUpsell(it)) return false;
      var f = cvFind(it.variant_id); return !!(f && f.prod.monthly);
    });
  }
  function cvHtml(cart) {
    if (!cart) return "";
    var ls = cvLines(cart); if (!ls.length) return "";
    var n = ls.reduce(function (a, it) { return a + it.quantity; }, 0);
    var now = ls.reduce(function (a, it) { return a + it.final_line_price; }, 0);
    // Use the Monthly plan's own price (what checkout charges), not the display tiers.
    function mUnit(it) { var f = cvFind(it.variant_id), pp = f.v.plans[String(f.prod.monthly)]; return pp != null ? pp : f.v.price; }
    var sub = ls.reduce(function (a, it) { return a + mUnit(it) * it.quantity; }, 0);
    var save = now - sub, after = subCount(cart).n + n, at = FF.creatineAt || 3, need = Math.max(0, at - after);
    var pct = now > 0 ? Math.round(save / now * 100) : 0;
    var energy = ls.some(function (it) { return /energy/i.test(it.product_title); });
    var cr = QB && QB.creatine;
    var unit = ls.length === 1 ? money(mUnit(ls[0])) + '/pack' : money(sub);
    var deal = (pct > 0 ? 'Subscribe &amp; save ' + pct + '%: ' : 'Subscribe: ') + unit;
    var sw = '<span class="cvc__sw" aria-hidden="true"></span>';
    var h;
    if (cr && !need) {
      // 3+ packs: a small product card for the free creatine, with the toggle on the right
      h = '<div class="cvc cvc--card" data-cv><button type="button" class="cvc__card" role="switch" aria-checked="false" data-cv-go aria-label="Turn on subscription and get free creatine">' +
        (cr.img ? '<img class="cvc__img" src="' + esc(cr.img) + '" alt="" width="44" height="44" loading="lazy">' : '') +
        '<span class="cvc__body"><b>Free creatine</b><span class="cvc__price">' + (cr.price ? '<s>' + money(cr.price) + '</s> ' : '') + 'FREE with every delivery</span><span class="cvc__deal">' + deal + '</span></span>' + sw + '</button>';
    } else {
      h = '<div class="cvc" data-cv><button type="button" class="cvc__row" role="switch" aria-checked="false" data-cv-go>' + sw + '<span class="cvc__h">' + deal + '</span></button>';
      if (cr && need) h += '<button type="button" class="cvc__alt" data-cv-go data-cv-add="' + need + '">Make it ' + at + ' packs: free creatine with every delivery while you stay subscribed &rarr;</button>';
    }
    h += '<p class="cvc__fine">Renews automatically every 30 days at ' + money(sub) + ' until you cancel. Skip or cancel online anytime.' + (cr && !need ? ' Free creatine while you keep ' + at + '+ subscription packs.' : '') + '</p>';
    return h + '</div>';
  }
  function cvMount(cart) {
    if (cart) cvCart = cart;
    var html = cvHtml(cvCart);
    $$("[data-cv-slot], [data-cv-mount]").forEach(function (m) { m.innerHTML = html; m.hidden = !html; });
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-cv-go]"); if (!b || !cvCart) return;
    var ls = cvLines(cvCart); if (!ls.length) return;
    var extra = +(b.getAttribute("data-cv-add") || 0);
    var big = ls.reduce(function (a, it) { return !a || it.quantity > a.quantity ? it : a; }, null);
    $$("[data-cv-go]").forEach(function (x) { x.disabled = true; }); b.textContent = "Switching…";
    ls.reduce(function (p, it) {
      var f = cvFind(it.variant_id), q = it.quantity + (it === big ? extra : 0);
      return p.then(function () { return post(FF.routes.cartChange, { id: it.key, quantity: q, selling_plan: +f.prod.monthly }); });
    }, Promise.resolve())
      .then(getCart).then(settle).then(function (r) {
        toast(r && r.cart && (r.cart.items || []).some(isCreatine) ? "Switched to Monthly. Your creatine ships free." : "Switched to Monthly. Skip or cancel online anytime.");
        if (document.querySelector("[data-cart-page]")) location.reload();
      })
      .catch(function (x) { toast((x && x.message) || "Could not switch to Monthly. Try again."); refreshCart(); });
  });

  function progressHtml(n, sub, glow) {
    var ship = FF.freeShipAt || 2, cre = FF.creatineAt || 3, t = FF.text || {};
    if (sub == null) sub = n;
    var msg = n === 0 ? (t.empty || "") : n < ship ? (t.perk1 || "") : sub < cre ? (t.perk2 || "") : (t.done || "");
    var pct = Math.min(1, Math.max(n / ship * 0.5, sub / cre));
    if (glow) { msg = "You have " + glow + " packs. Subscribe and a pouch of creatine ships free with every delivery."; pct = 1; }
    return '<div class="progress' + (glow ? ' is-glow' : '') + '"><div class="progress__msg">' + esc(msg) + '</div><div class="progress__ring"><div class="progress__track"><div class="progress__fill" style="transform:scaleX(' + pct + ')"></div></div></div></div>';
  }
  function setCount(n) { $$("[data-count]").forEach(function (c) { c.textContent = n; c.classList.remove("bump"); void c.offsetWidth; c.classList.add("bump"); }); }

  // Everything the shopper saves on this cart: subscription price vs regular price, plus every
  // discount code or automatic discount Shopify applied (line-level and cart-level), by name.
  function savings(cart) {
    var sub = 0, by = {}, order = [], lines = {};
    function add(title, amt) { if (!(amt > 0)) return; title = title || "Discount"; if (!(title in by)) { by[title] = 0; order.push(title); } by[title] += amt; }
    (cart.items || []).forEach(function (it) {
      if (isCreatine(it)) return;
      var ls = 0, spa = it.selling_plan_allocation;
      if (spa && spa.compare_at_price > spa.price) { var d = (spa.compare_at_price - spa.price) * it.quantity; sub += d; ls += d; }
      (it.line_level_discount_allocations || []).forEach(function (al) { add(al.discount_application && al.discount_application.title, al.amount); ls += al.amount; });
      lines[it.key] = ls;
    });
    (cart.cart_level_discount_applications || []).forEach(function (ap) { add(ap.title, ap.total_allocated_amount); });
    var disc = order.map(function (t) { return { title: t, amount: by[t] }; });
    var total = sub + disc.reduce(function (x, d) { return x + d.amount; }, 0);
    return { sub: sub, disc: disc, total: total, before: cart.total_price + total, lines: lines, gift: (cart.items || []).some(isCreatine) };
  }
  function saveBannerHtml(sv) {
    if (!(sv.total > 0)) return "";
    var chips = [];
    if (sv.sub > 0) chips.push('<li>Subscription savings <b>&minus;' + money(sv.sub) + '</b></li>');
    sv.disc.forEach(function (d) { chips.push('<li>' + esc(d.title) + ' <b>&minus;' + money(d.amount) + '</b></li>'); });
    if (sv.gift && FF.quick && FF.quick.creatine && FF.quick.creatine.price) chips.push('<li>Plus free creatine, a ' + money(FF.quick.creatine.price) + ' value</li>');
    var pct = sv.before > 0 ? Math.round(sv.total / sv.before * 100) : 0;
    return '<div class="save-banner" role="status"><p class="save-banner__h">You&rsquo;re saving <b>' + money(sv.total) + '</b>' + (pct >= 5 ? ' <span>(' + pct + '% off)</span>' : '') + '</p><ul class="save-banner__list">' + chips.join("") + '</ul></div>';
  }
  // ---------- Discount codes and order note (drawer and /cart) ----------
  var tools = { disc: false, note: false, err: "" };
  function cartToolsHtml(cart) {
    var codes = cart.discount_codes || [];
    var on = codes.filter(function (c) { return c.applicable; }).map(function (c) { return c.code; });
    var h = '<div class="ctools">';
    h += '<details class="ctool"' + (tools.disc || tools.err ? ' open' : '') + ' data-tool="disc"><summary>Discount code' + (on.length ? ' <span class="ctool__on">' + esc(on.join(", ")) + '</span>' : '') + '</summary>' +
      '<form class="ctool__row" data-disc-form><label class="sr" for="disc-in">Discount code</label><input id="disc-in" name="code" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="Enter code"><button class="btn btn--ghost" type="submit">Apply</button></form>' +
      (tools.err ? '<p class="ctool__err" role="alert">' + esc(tools.err) + '</p>' : '') +
      (codes.length ? '<ul class="ctool__codes">' + codes.map(function (c) { return '<li class="' + (c.applicable ? '' : 'is-off') + '">' + esc(c.code) + (c.applicable ? '' : ' <small>not valid for this cart</small>') + ' <button type="button" data-disc-rm="' + esc(c.code) + '" aria-label="Remove code ' + esc(c.code) + '">&times;</button></li>'; }).join("") + '</ul>' : '') +
      '</details>';
    h += '<details class="ctool"' + (tools.note ? ' open' : '') + ' data-tool="note"><summary>Order note' + (cart.note ? ' <span class="ctool__on">added</span>' : '') + '</summary>' +
      '<label class="sr" for="cart-note">Order note</label><textarea id="cart-note" data-cart-note maxlength="500" rows="2" placeholder="Anything we should know?">' + esc(cart.note || "") + '</textarea></details>';
    return h + '</div>';
  }
  function setCodes(list) { return post(FF.routes.cartUpdate || "/cart/update.js", { discount: list.join(",") }); }
  function afterTools() { return getCart().then(settle).then(function () { if (document.querySelector("[data-cart-page]")) location.reload(); }); }
  document.addEventListener("toggle", function (e) { var d = e.target; if (d && d.matches && d.matches("details[data-tool]")) tools[d.getAttribute("data-tool")] = d.open; }, true);
  document.addEventListener("submit", function (e) {
    var f = e.target.closest && e.target.closest("[data-disc-form]"); if (!f) return;
    e.preventDefault();
    var code = (f.code.value || "").trim(); if (!code) return;
    var btn = f.querySelector("button"); btn.disabled = true; btn.textContent = "Applying…";
    getCart().then(function (c) {
      var have = (c.discount_codes || []).filter(function (x) { return x.applicable; }).map(function (x) { return x.code; });
      if (have.some(function (x) { return x.toLowerCase() === code.toLowerCase(); })) return c;
      return setCodes(have.concat([code]));
    }).then(function (c) {
      var hit = (c.discount_codes || []).filter(function (x) { return x.code.toLowerCase() === code.toLowerCase(); })[0];
      tools.disc = true;
      tools.err = hit && hit.applicable ? "" : code.toUpperCase() + " can’t be used with this cart.";
      if (!tools.err) toast(code.toUpperCase() + " applied.");
      return afterTools();
    }).catch(function () { tools.err = "Could not apply that code. Try again."; return afterTools(); });
  });
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-disc-rm]"); if (!b) return;
    var rm = b.getAttribute("data-disc-rm"); b.disabled = true;
    getCart().then(function (c) { return setCodes((c.discount_codes || []).map(function (x) { return x.code; }).filter(function (x) { return x !== rm; })); })
      .then(function () { tools.err = ""; return afterTools(); }).catch(function () { refreshCart(); });
  });
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-disc-apply-page]"); if (!b) return;
    var inp = b.parentNode.querySelector("input"), code = (inp.value || "").trim(); if (!code) return;
    b.disabled = true; b.textContent = "Applying\u2026";
    getCart().then(function (c) { var have = (c.discount_codes || []).filter(function (x) { return x.applicable; }).map(function (x) { return x.code; }); return setCodes(have.concat([code])); })
      .then(function () { location.reload(); }).catch(function () { location.reload(); });
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Enter" && e.target.closest && e.target.closest("[data-disc-form-page]")) { e.preventDefault(); var b = e.target.closest("[data-disc-form-page]").querySelector("[data-disc-apply-page]"); if (b) b.click(); } });
  var noteT = 0;
  document.addEventListener("input", function (e) {
    var t = e.target.closest && e.target.closest("[data-cart-note]"); if (!t) return;
    clearTimeout(noteT); var v = t.value;
    noteT = setTimeout(function () { post(FF.routes.cartUpdate || "/cart/update.js", { note: v }).catch(function () {}); }, 500);
  });
  // Auto-renewal terms shown by the Checkout button whenever the cart has a subscription
  // (California ARL: renewal, frequency, recurring price and how to cancel, near the point of consent).
  function renewHtml(cart) {
    var m = 0, q = 0;
    (cart.items || []).forEach(function (it) {
      var spa = it.selling_plan_allocation; if (!spa || isCreatine(it)) return;
      var amt = (spa.price != null ? spa.price : it.final_price) * it.quantity;
      if (/90|3 month|quarter/i.test(spa.selling_plan.name)) q += amt; else m += amt;
    });
    if (!m && !q) return "";
    var parts = []; if (m) parts.push("every 30 days at " + money(m)); if (q) parts.push("every 90 days at " + money(q));
    var gift = (cart.items || []).some(isCreatine) ? " Free creatine continues while you keep 3 or more subscription packs." : "";
    return '<p class="renew-note">Your subscription renews automatically ' + parts.join(" and ") + ' (before any one-time discounts, plus tax) until you cancel. Skip or cancel online anytime in your account.' + gift + '</p>';
  }
  function renderCart(cart) {
    var body = $("[data-cart-body]"), foot = $("[data-cart-foot]");
    if (!body) return;
    var packs = (cart.items || []).reduce(function (a, it) { return a + (isCreatine(it) ? 0 : it.quantity); }, 0);
    setCount(cart.item_count);
    if (!cart.item_count) {
      var qbh = qbHtml();
      body.innerHTML = qbh ? '<div data-qb-slot>' + qbh + '</div>' : progressHtml(0) + '<div class="empty"><b>' + esc((FF.text && FF.text.empty) || "Your box is empty.") + '</b></div><div style="display:grid;gap:10px"><a class="btn btn--money" href="/products/everyday">Shop Everyday</a><a class="btn btn--ghost" href="/products/energy">Shop Energy</a></div>';
      foot.innerHTML = ""; var ex0 = $("[data-cart-extra]"); if (ex0) ex0.hidden = true; return;
    }
    var sv = savings(cart);
    var lines = cart.items.map(function (it, i) {
      if (isCreatine(it)) {
        var cimg = it.image ? '<img src="' + esc(it.image + (it.image.indexOf('?') > -1 ? '&' : '?') + 'width=160') + '" alt="" loading="lazy">' : "";
        return '<div class="cart-line cart-line--gift"><div class="pack">' + cimg + '</div><div><b>Free creatine</b><small>' + esc((FF.text && FF.text.creatine) || "Free with 3+ subscription packs") + '</small></div><div class="cart-line__price">FREE</div></div>';
      }
      if (isUpsell(it)) {
        var uimg = it.image ? '<img src="' + esc(it.image + (it.image.indexOf('?') > -1 ? '&' : '?') + 'width=160') + '" alt="" loading="lazy">' : "";
        var ustrike = it.original_line_price > it.final_line_price ? "<s>" + money(it.original_line_price) + "</s>" : "";
        return '<div class="cart-line cart-line--gift" data-line="' + (i + 1) + '"><div class="pack">' + uimg + '</div><div><b>2nd creatine bag</b><small>Every 3 months \u00b7 ' + UP.pct + '% off</small><br><button type="button" class="linkish" data-dec aria-label="Remove 2nd creatine bag">Remove</button><output hidden>1</output></div><div class="cart-line__price">' + ustrike + money(it.final_line_price) + '</div></div>';
      }
      var plan = it.selling_plan_allocation ? planLabel(it.selling_plan_allocation.selling_plan.name) : "One-time";
      var img = it.image ? '<img src="' + esc(it.image + (it.image.indexOf('?') > -1 ? '&' : '?') + 'width=160') + '" alt="" loading="lazy">' : "";
      var lsave = sv.lines[it.key] || 0, lbefore = it.final_line_price + lsave;
      var strike = lbefore > it.final_line_price ? "<s>" + money(lbefore) + "</s>" : "";
      return '<div class="cart-line" data-line="' + (i + 1) + '"><div class="pack">' + img + '</div>' +
        '<div><b>' + esc(shortTitle(it.product_title)) + '</b><small>' + esc(flavorName(it.variant_title || "")) + ' \u00b7 ' + esc(plan) + '</small><br>' +
        '<div class="qty"><button type="button" data-dec aria-label="Remove one">&minus;</button><output class="num">' + it.quantity + '</output><button type="button" data-inc aria-label="Add one">+</button></div><button type="button" class="linkish cart-line__rm" data-remove>Remove</button></div>' +
        '<div class="cart-line__price">' + strike + money(it.final_line_price) + (lsave > 0 ? '<span class="save-tag">You save ' + money(lsave) + '</span>' : '') + '</div></div>';
    }).join("");
    var offer = "";
    if (UP && quarterlyFree(cart) && !(cart.items || []).some(isUpsell)) {
      var was = UP.price, now = Math.round(UP.price * (100 - UP.pct) / 100);
      offer = '<div class="upsell"><div><b>Add a 2nd creatine bag, ' + UP.pct + '% off</b><small>One pouch is 45 servings. A 2nd bag covers your full 90 days, every 3 months.</small></div>' +
        '<button type="button" class="btn btn--ghost upsell__btn" data-upsell-add>Add <s>' + money(was) + '</s> ' + money(now) + '</button></div>';
    }
    var rows = "";
    if (sv.total > 0) {
      rows += '<div class="total-row total-row--before"><span>Before savings</span><span><s>' + money(sv.before) + '</s></span></div>';
      if (sv.sub > 0) rows += '<div class="total-row total-row--save"><span>Subscription savings</span><span>&minus;' + money(sv.sub) + '</span></div>';
      sv.disc.forEach(function (d) { rows += '<div class="total-row total-row--save"><span>' + esc(d.title) + '</span><span>&minus;' + money(d.amount) + '</span></div>'; });
    }
    var otpN = cvLines(cart).reduce(function (x, it) { return x + it.quantity; }, 0), creAt = FF.creatineAt || 3;
    var glow = otpN >= creAt && subCount(cart).n < creAt ? otpN : 0;
    var hasEnergy = (cart.items || []).some(function (it) { return !isCreatine(it) && /energy/i.test(it.product_title); });
    var caf = hasEnergy ? '<p class="caf-note"><b>Energy contains caffeine (150mg per stick).</b> Consult your healthcare professional before use, especially if you are pregnant, nursing, taking medication, have a medical condition, or are sensitive to caffeine. Not recommended for children.</p>' : '';
    body.innerHTML = progressHtml(packs, subCount(cart).n, glow) + (glow ? '<div data-cv-slot hidden></div>' : '') + lines + offer + (glow ? '' : '<div data-cv-slot hidden></div>') + '<div data-cu-slot hidden></div>' + caf +
      (rows ? '<div class="csave">' + rows + '</div>' : '') +
      '';
    var extra = $("[data-cart-extra]"); if (extra) extra.hidden = false;
    foot.innerHTML = cartToolsHtml(cart) +
      '<div class="total-row total-row--big"><span>Subtotal</span><span>' + money(cart.total_price) + '</span></div>' +
      (sv.total > 0 ? '<p class="save-total">You save ' + money(sv.total) + '</p>' : '') +
      renewHtml(cart) +
      '<p class="legal legal--foot">Taxes and shipping calculated at checkout.</p>' +
      '<a class="btn btn--money btn--block" href="' + esc(FF.routes.checkout) + '" style="margin-top:10px">Checkout ' + money(cart.total_price) + (sv.total > 0 ? ' · Save ' + money(sv.total) : '') + '</a>';
  }
  function settle(cart) {
    return syncCreatine(cart).then(function (r) {
      var had = (cart.items || []).some(isCreatine);
      if (r.changed && r.upOnly) toast("2nd creatine bag removed: it comes with Every 3 months.");
      else if (r.changed && r.added && !had) toast("Free creatine added to your box.");
      if (r.changed && !r.added && had) toast("Free creatine needs 3 or more subscription packs.");
      renderCart(r.cart); cvMount(r.cart); cuMount(r.cart); return r;
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
    if (e.target.closest("[data-remove]")) changeLine(n, 0);
  });

  // ---------- Product buy box ----------
  $$("[data-product]").forEach(function (pd) {
    var dataEl = $("[data-product-json]", pd) || $("[data-product-json]");
    if (!dataEl) return;
    var P = JSON.parse(dataEl.textContent);
    var V = {}; P.variants.forEach(function (v) { V[v.id] = v; });
    var MAXQ = 24;
    var hasSub = !!$('[data-pp] [data-v="sub"]', pd);
    var dp = pd.getAttribute("data-default-plan"), st = { plan: dp && $('[data-pp] [data-v="' + dp + '"]', pd) ? dp : hasSub ? "sub" : "otp", q: {} };
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


    // ---- Stage choreography: packs slide in and out; the free creatine arrives or leaves ----
    var prevK = {}, prevGift = null, stageEl = $("[data-pd-stack]", pd), giftEl = $("[data-pd-gift]", pd);
    var reduceM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    var phEl = $("[data-pd-ph]", pd);
    function recount() {
      if (!stageEl) return;
      var n = $$("[data-stack]", pd).filter(function (f) { return !f.classList.contains("is-out"); }).length;
      // Empty box: show the placeholder pouch so the stage is never bare (it is not a selection).
      if (phEl) phEl.classList.toggle("is-out", n > 0);
      stageEl.setAttribute("data-n", n || (phEl ? 1 : 0));
    }
    function bump(fig) { var c = $(".pd__count", fig); if (!c) return; c.classList.remove("is-bump"); void c.offsetWidth; c.classList.add("is-bump"); }
    function fly(fig, dir) {
      var img = $(".pack img", fig); if (!img || !stageEl || reduceM) return;
      var sr = stageEl.getBoundingClientRect(), fr = $(".pack", fig).getBoundingClientRect();
      var c = img.cloneNode(); c.removeAttribute("fetchpriority"); c.removeAttribute("loading"); c.alt = ""; c.className = "pd__fly pd__fly--" + dir;
      c.style.left = (fr.left - sr.left) + "px"; c.style.top = (fr.top - sr.top) + "px"; c.style.width = fr.width + "px";
      stageEl.appendChild(c); c.addEventListener("animationend", function () { c.remove(); });
    }
    function stageDraw() {
      $$("[data-stack]", pd).forEach(function (fig) {
        var id = fig.dataset.stack, k = st.q[id] || 0, was = prevK[id] == null ? k : prevK[id];
        $(".pd__count", fig).textContent = "×" + k;
        if (reduceM || was === k) { if (!fig.classList.contains("is-leave")) fig.classList.toggle("is-out", !k); }
        else if (k && !was) { fig.classList.remove("is-out", "is-leave", "is-enter"); void fig.offsetWidth; fig.classList.add("is-enter"); }
        else if (!k && was) {
          fig.classList.remove("is-enter"); fig.classList.add("is-leave");
          fig.addEventListener("animationend", function h(e) {
            if (e.animationName !== "pd-leave") return; fig.removeEventListener("animationend", h);
            fig.classList.remove("is-leave"); if (!(st.q[id] > 0)) fig.classList.add("is-out"); recount();
          });
        }
        else if (k > was) { fly(fig, "in"); setTimeout(function () { bump(fig); }, 520); }
        else { fly(fig, "out"); bump(fig); }
        prevK[id] = k;
      });
      recount();
    }
    function giftDraw(on) {
      if (!giftEl) return;
      if (prevGift === null || reduceM) { giftEl.hidden = !on; prevGift = on; return; }
      if (on === prevGift) return;
      prevGift = on;
      giftEl.classList.remove("is-arrive", "is-depart"); void giftEl.offsetWidth;
      if (on) {
        giftEl.hidden = false; giftEl.classList.add("is-arrive");
        
      } else {
        giftEl.classList.add("is-depart");
        giftEl.addEventListener("animationend", function h(e) {
          if (e.animationName !== "pd-gift-out") return; giftEl.removeEventListener("animationend", h);
          giftEl.classList.remove("is-depart"); if (!prevGift) giftEl.hidden = true;
        });
      }
    }
    function draw() {
      var n = total(), full = 0, tot = 0;
      Object.keys(st.q).forEach(function (id) { var v = V[id], k = st.q[id]; full += v.price * k; tot += unit(v, st.plan, n) * k; });
      var save = full - tot;
      // Stage
      stageDraw();
      // Rows
      $$("[data-fq]", pd).forEach(function (row) {
        var id = row.dataset.fq, k = st.q[id], v = V[id], inp = $("input", row);
        if (document.activeElement !== inp) inp.value = k;
        $('[data-step="-1"]', row).disabled = k <= 0;
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
      giftDraw(creOn);
      var cre = creOn ? "Free creatine included." : "Free creatine with " + creAt + " or more packs" + (n ? " (add " + (creAt - n) + " more)." : ".");
      var note = st.plan === "q3" ? "Renews automatically every 90 days at the price shown until you cancel. Free Shipping. Skip or cancel online anytime."
        : st.plan === "sub" ? "Renews automatically every 30 days at the price shown until you cancel. Free Shipping. Skip or cancel online anytime."
        : "One delivery, no subscription. " + (n >= 2 ? "Free Shipping." : "Shipping " + money(SHIP_OTP) + ", free from 2 packs.");
      $("[data-plan-note]", pd).innerHTML = note;
      // Savings bar
      var tw = $("[data-tiers]", pd);
      if (tw) {
        var hadGift = tw.classList.contains("has-gift");
        tw.classList.toggle("has-gift", creOn);
        if (creOn && !hadGift && tw.dataset.ready) { tw.classList.remove("is-peek"); void tw.offsetWidth; tw.classList.add("is-peek"); }
        tw.dataset.ready = "1";
      }
      var on1 = st.plan !== "otp", on2 = n >= 2, on3 = st.plan === "q3";
      $$("[data-tier]", pd).forEach(function (t) { var k = +t.dataset.tier; var on = k === 1 ? on1 : k === 2 ? on2 : on3; t.classList.toggle("is-on", on); t.classList.toggle("is-next", !on && (k === 2 ? on1 : k === 3 ? on1 && on2 : true)); });
      var tm = $("[data-tiers-msg]", pd);
      if (tm) tm.innerHTML = st.plan === "otp" ? "Savings and free creatine come with a subscription."
        : !creOn ? "Add " + (creAt - n) + " more " + (creAt - n === 1 ? "pack" : "packs") + " for <b>free creatine with every delivery</b>."
        : st.plan === "q3" ? "<b>Best value unlocked:</b> " + P.quarterlyPct + "% off and free creatine with every delivery." : "Free creatine unlocked. Switch to <b>Every 3 months</b> for " + P.quarterlyPct + "% off.";
      // Receipt
      var rc = $("[data-pd-receipt]", pd), html = "";
      Object.keys(st.q).forEach(function (id) { if (st.q[id]) html += '<li class="item"><span class="item__name">' + st.q[id] + "\u00d7 " + esc((V[id].formula ? V[id].formula + " " : "") + flavorName(V[id].title)) + '</span><span class="item__lead"></span><span class="item__val">' + money(V[id].price * st.q[id]) + "</span></li>"; });
      if (save > 0) html += '<li class="item item--save"><span class="item__name">' + (st.plan === "otp" ? "2+ pack savings" : "Subscription savings") + '</span><span class="item__lead"></span><span class="item__val">&minus;' + money(save) + "</span></li>";
      if (creOn) html += '<li class="item item--add"><span class="item__name">Free creatine</span><span class="item__lead"></span><span class="item__val">FREE</span></li>';
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
    if (form) form.addEventListener("submit", function (e) {
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
  });

  // Fruit settles behind a pouch while its back shows; white powder bursts on each turn.
  // ---------- Powder explosion: billowing plumes, fine dust and a few crystals, fanning upward ----------
  function powderBurst(host, opt) {
    opt = opt || {};
    if (!host || (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches)) return;
    var pw = parseFloat(getComputedStyle(host).getPropertyValue("--pw")) || host.offsetWidth || 240;
    var S = Math.round(pw * (opt.scale || 4.2)), dpr = Math.min(2, window.devicePixelRatio || 1);
    var cv = document.createElement("canvas"); cv.className = "powder"; cv.setAttribute("aria-hidden", "true");
    cv.width = S * dpr; cv.height = S * dpr; cv.style.width = cv.style.height = S + "px";
    cv.style.left = (-S / 2) + "px"; cv.style.top = (-S * .58) + "px";
    host.appendChild(cv);
    var ctx = cv.getContext("2d"); ctx.scale(dpr, dpr);
    var cx = S / 2, cy = S * .58, k = pw / 240, light = !!opt.light, plumes = [], dust = [], chunks = [];
    function fan() { return Math.random() < .2 ? Math.random() * Math.PI * 2 : -Math.PI / 2 + (Math.random() + Math.random() + Math.random() - 1.5) * 1.5; }
    for (var i = 0; i < 28; i++) { var a = fan(), v = (3 + Math.random() * 7) * k; plumes.push({ x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: (14 + Math.random() * 16) * k, g: (1.8 + Math.random() * 2.2) * k, a: 0, peak: .55 + Math.random() * .35, t: Math.random() * 6 }); }
    for (i = 0; i < 700; i++) { a = fan(); v = (2.5 + Math.pow(Math.random(), .6) * 13) * k; dust.push({ x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, s: .6 + Math.random() * 1.3, a: .7 + Math.random() * .3, d: .91 + Math.random() * .05 }); }
    for (i = 0; i < 22; i++) { a = fan(); v = (5 + Math.random() * 10) * k; chunks.push({ x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, s: (2.2 + Math.random() * 2.6) * Math.max(.8, k), rot: Math.random() * 6.28, vr: (Math.random() - .5) * .4, a: 1 }); }
    var t0 = performance.now(), last = t0, DUR = 2000;
    (function frame(now) {
      var el = now - t0, dt = Math.min(2.5, (now - last) / 16.67); last = now;
      var life = el / DUR;
      ctx.clearRect(0, 0, S, S);
      // plumes: soft clouds that rush out, slow down, swell and fade
      plumes.forEach(function (p) {
        p.vx *= Math.pow(.93, dt); p.vy *= Math.pow(.93, dt); p.vy -= .015 * dt * k; p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.g * dt; p.g *= Math.pow(.985, dt);
        p.a = life < .12 ? p.peak * (life / .12) : p.peak * Math.max(0, 1 - (life - .12) / .88);
        var wob = Math.sin(p.t + el / 180) * p.r * .06;
        if (light) { var sh = ctx.createRadialGradient(p.x + 2, p.y + 3, 0, p.x + 2, p.y + 3, p.r * 1.05); sh.addColorStop(0, "rgba(11,28,41," + (p.a * .12) + ")"); sh.addColorStop(1, "rgba(11,28,41,0)"); ctx.fillStyle = sh; ctx.beginPath(); ctx.arc(p.x + 2, p.y + 3, p.r * 1.05, 0, 6.283); ctx.fill(); }
        var gr = ctx.createRadialGradient(p.x + wob, p.y, 0, p.x + wob, p.y, p.r);
        gr.addColorStop(0, "rgba(255,255,255," + p.a + ")"); gr.addColorStop(.45, "rgba(255,255,255," + (p.a * .55) + ")"); gr.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(p.x + wob, p.y, p.r, 0, 6.283); ctx.fill();
      });
      // fine dust
      ctx.fillStyle = light ? "rgba(11,28,41,.18)" : "rgba(0,0,0,0)";
      dust.forEach(function (d) { d.vx *= Math.pow(d.d, dt); d.vy *= Math.pow(d.d, dt); d.vy += .05 * dt * k; d.x += d.vx * dt; d.y += d.vy * dt; d.al = d.a * Math.max(0, 1 - Math.max(0, life - .25) / .75); });
      if (light) dust.forEach(function (d) { ctx.globalAlpha = d.al; ctx.fillRect(d.x + .5, d.y + .7, d.s, d.s); });
      ctx.fillStyle = "#fff"; dust.forEach(function (d) { ctx.globalAlpha = d.al; ctx.fillRect(d.x, d.y, d.s, d.s); });
      // crystals: chunky grains flung out under gravity
      chunks.forEach(function (c) {
        c.vx *= Math.pow(.97, dt); c.vy += .14 * dt * k; c.x += c.vx * dt; c.y += c.vy * dt; c.rot += c.vr * dt;
        ctx.globalAlpha = Math.max(0, 1 - Math.max(0, life - .5) / .5);
        ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.rot);
        ctx.fillStyle = "#fff"; ctx.fillRect(-c.s / 2, -c.s / 2, c.s, c.s);
        ctx.fillStyle = "rgba(11,28,41,.22)"; ctx.fillRect(-c.s / 2, c.s / 2 - .8, c.s, .8);
        ctx.restore();
      });
      ctx.globalAlpha = 1;
      if (el < DUR) requestAnimationFrame(frame); else cv.remove();
    })(t0);
  }

  function burstTurn(b, back) {
    if (!b) return;
    b.classList.toggle("is-fruit", back);
    b.classList.remove("is-pop"); void b.offsetWidth; b.classList.add("is-pop");
    powderBurst(b, { light: !b.closest(".hz-slide--dark, .cr-hero") });
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
      var m3 = pk.bag && pk.bag._p3d;
      pk.spinEl.style.setProperty("--spin", m3 ? "0deg" : pk.spin.toFixed(2) + "deg");
      if (m3) m3.setAngle(-(pk.rest + pk.spin));
      var back = Math.cos((pk.rest + pk.spin) * Math.PI / 180) < 0;
      if (pk.bag) pk.bag.classList.toggle("show-back", back);
      if (back !== pk.back) { pk.back = back; burstTurn(pk.burst, back); }
    }
    packs.forEach(function (pk) { if (pk.bag) pk.bag._p3dSync = function () { apply(pk); }; });
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

  // ---------- Timed reveals: --tp runs 0 to 1 once the section is in view ----------
  // Lines that draw, words that fill and sticks that slide in finish on their own,
  // so nobody has to scroll to the end to see them. Parallax drift stays on --sp.
  (function () {
    var secs = $$("[data-spill], .crf, [data-nmj]");
    if (!secs.length || !("IntersectionObserver" in window)) return;
    if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    function ease(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
    function run(el) {
      var dur = +el.getAttribute("data-tp-ms") || 2400, t0 = null;
      function f(now) { if (!t0) t0 = now; var p = Math.min(1, (now - t0) / dur); el.style.setProperty("--tp", ease(p).toFixed(4)); if (p < 1) requestAnimationFrame(f); }
      requestAnimationFrame(f);
    }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { io.unobserve(e.target); run(e.target); } });
    }, { threshold: 0, rootMargin: "0px 0px -35% 0px" });
    secs.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.bottom < 0) return; // already scrolled past: leave it finished
      el.style.setProperty("--tp", "0"); io.observe(el);
    });
  })();

  // ---------- Label rows light up one after the other, on a timer ----------
  // Starts once the section is in view and runs on its own, so every row gets its
  // moment even if the visitor stops scrolling. Each row stays marked as read.
  $$("[data-hl-section]").forEach(function (sec) {
    var rows = $$("[data-hl]", sec);
    if (!rows.length) return;
    var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    function allRead() { rows.forEach(function (r) { r.classList.add("is-read"); r.classList.remove("is-on"); }); }
    if (reduce || !("IntersectionObserver" in window)) { allRead(); return; }
    var i = -1, timer = null, STEP = 420;
    function step() {
      if (i >= 0) rows[i].classList.remove("is-on");
      i++;
      if (i >= rows.length) { timer = null; return; }
      rows[i].classList.add("is-read", "is-on");
      timer = setTimeout(step, i === rows.length - 1 ? STEP * 2 : STEP);
    }
    var io = new IntersectionObserver(function (es) {
      if (es[0].isIntersecting && i < 0 && !timer) { timer = setTimeout(step, 250); io.disconnect(); }
    }, { threshold: .2 });
    io.observe(sec);
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

  // ---------- Salt: a fine, continuous stream pouring from each stick ----------
  // Thousands of tiny grains leave the open end together, so they draw one smooth
  // arc; small sideways jitter widens it as it falls and the tail frays out.
  $$("[data-salt-canvas]").forEach(function (cv) {
    var sec = cv.closest("section"); if (!sec || !cv.getContext) return;
    var ctx = cv.getContext("2d"), sides = $$(".lfx-side", sec), dpr = Math.min(2, window.devicePixelRatio || 1);
    var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    var W = 0, H = 0, parts = [], running = false, visible = false, last = 0, small = window.innerWidth < 860, MAX = small ? 5000 : 13000, RATE = small ? 20 : 46;
    function size() { var r = sec.getBoundingClientRect(); W = r.width; H = r.height; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    function mouths() {
      var sr = sec.getBoundingClientRect();
      return sides.map(function (sd) {
        var a = sd.getBoundingClientRect(), st = $(".lfx-stick", sd).getBoundingClientRect();
        var mx = a.left - sr.left, my = a.top - sr.top, cx = st.left + st.width / 2 - sr.left, cy = st.top + st.height / 2 - sr.top;
        var dx = mx - cx, dy = my - cy, l = Math.hypot(dx, dy) || 1;
        return { x: mx, y: my, dx: dx / l, dy: dy / l, fall: Math.min(H - my - 10, Math.max(420, H * .78)) };
      });
    }
    function inAmount() { var sp = parseFloat(sec.style.getPropertyValue("--tp")); if (isNaN(sp)) sp = 1; return Math.min(1, Math.max(0, (sp - .1) * 4.5)); }
    function spawn(m) {
      var big = Math.random() < .05, along = .62 + Math.random() * .12, off = (Math.random() + Math.random() - 1) * 6;
      parts.push({
        x: m.x - m.dy * off, y: m.y + m.dx * off * .4,
        vx: m.dx * along + (Math.random() - .5) * .06, vy: m.dy * along + (Math.random() - .5) * .06,
        s: big ? 1.8 + Math.random() * .9 : .8 + Math.random() * 1.1,
        j: .008 + Math.random() * .03, end: m.y + m.fall * (.7 + Math.random() * .4),
        pink: Math.random() < .08, a: .9 + Math.random() * .1, big: big, rot: Math.random() * 6.28
      });
    }
    function step(dt, emit) {
      if (emit) { var ms = mouths(); ms.forEach(function (m) { var k = RATE * dt; while (k > 0) { if (Math.random() < k) { spawn(m); var np = parts[parts.length - 1], f = Math.random() * dt; np.vy += .085 * f; np.x += np.vx * f; np.y += np.vy * f; } k -= 1; } }); }
      for (var i = parts.length - 1; i >= 0; i--) {
        var p = parts[i];
        p.vy += .085 * dt; p.vx += (Math.random() - .5) * p.j * dt; p.vx *= Math.pow(.997, dt);
        p.x += p.vx * dt; p.y += p.vy * dt; p.rot += .08 * dt;
        if (p.y > p.end) { p.a -= .035 * dt; if (p.a <= 0 || p.y > H + 4) { parts.splice(i, 1); continue; } }
      }
      if (parts.length > MAX) parts.splice(0, parts.length - MAX);
    }
    function render() {
      ctx.clearRect(0, 0, W, H);
      // Batched drawing: grains grouped by colour and fade level, one fill per group.
      var L = 5, white = [], pink = [], shadow = [], bigs = [], i, p, q;
      for (i = 0; i < L; i++) { white.push([]); pink.push([]); shadow.push([]); }
      for (i = 0; i < parts.length; i++) {
        p = parts[i]; if (p.a <= 0) continue;
        q = Math.min(L - 1, Math.floor(p.a * L));
        if (p.big) { bigs.push(p); continue; }
        shadow[q].push(p); (p.pink ? pink : white)[q].push(p);
      }
      function fillGroup(list, color, alpha, ox, oy) {
        if (!list.length) return; ctx.globalAlpha = alpha; ctx.fillStyle = color; ctx.beginPath();
        for (var j = 0; j < list.length; j++) { var g = list[j]; ctx.rect(g.x + ox, g.y + oy, g.s, g.s); }
        ctx.fill();
      }
      for (i = 0; i < L; i++) fillGroup(shadow[i], "rgb(11,28,41)", .2 * (i + 1) / L, .6, .9);
      for (i = 0; i < L; i++) { fillGroup(white[i], "#ffffff", (i + 1) / L, 0, 0); fillGroup(pink[i], "#f3cdc7", (i + 1) / L, 0, 0); }
      for (i = 0; i < bigs.length; i++) {
        p = bigs[i]; ctx.globalAlpha = Math.max(0, p.a); ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = "rgba(11,28,41,.22)"; ctx.fillRect(-p.s / 2 + .6, -p.s / 2 + .9, p.s, p.s);
        ctx.fillStyle = p.pink ? "#f3cdc7" : "#fff"; ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s); ctx.restore();
      }
      ctx.globalAlpha = 1;
    }
    function tick(t) {
      if (!running) return;
      var dt = Math.min(2.5, (t - (last || t)) / 16.67); last = t;
      step(dt, visible && inAmount() > .92); render();
      if (visible || parts.length) requestAnimationFrame(tick); else { running = false; last = 0; }
    }
    function start() { if (!running) { running = true; last = 0; requestAnimationFrame(tick); } }
    function still() { size(); parts = []; for (var i = 0; i < 260; i++) step(1, true); render(); }
    size(); window.addEventListener("resize", function () { size(); if (reduce) still(); });
    if (reduce) { still(); return; }
    if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) start(); }, { rootMargin: "100px 0px" }).observe(sec);
    else { visible = true; start(); }
  });

  // ---------- Story cards light box ----------
  $$("[data-cards]").forEach(function (sec) {
    var cards = $$("[data-card]", sec), dlg = $("[data-cards-lb]", sec), stage = $("[data-cards-stage]", sec), count = $("[data-cards-count]", sec), cur = 0;
    if (!dlg || !dlg.showModal || !cards.length) return;
    function show(i) {
      cur = (i + cards.length) % cards.length;
      stage.innerHTML = ""; var c = cards[cur].cloneNode(true); c.removeAttribute("role"); stage.appendChild(c);
      count.textContent = (cur + 1) + " / " + cards.length;
    }
    cards.forEach(function (c, i) { var b = $("[data-card-open]", c); if (b) b.addEventListener("click", function () { show(i); dlg.showModal(); document.documentElement.classList.add("story-open"); }); });
    dlg.addEventListener("click", function (e) {
      if (e.target === dlg || e.target.closest("[data-cards-close]")) dlg.close();
      else if (e.target.closest("[data-cards-prev]")) show(cur - 1);
      else if (e.target.closest("[data-cards-next]")) show(cur + 1);
    });
    dlg.addEventListener("keydown", function (e) { if (e.key === "ArrowLeft") show(cur - 1); if (e.key === "ArrowRight") show(cur + 1); });
    dlg.addEventListener("close", function () { document.documentElement.classList.remove("story-open"); var b = $("[data-card-open]", cards[cur]); if (b) b.focus(); });
  });

  // ---------- Ingredients page: filter cards by formula ----------
  $$("[data-ing]").forEach(function (sec) {
    var btns = $$("[data-ing-f]", sec), cards = $$("[data-in]", sec), live = $("[data-ing-live]", sec);
    btns.forEach(function (b) {
      b.addEventListener("click", function () {
        var f = b.getAttribute("data-ing-f"), n = 0;
        btns.forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
        cards.forEach(function (c) {
          var on = f === "all" || c.getAttribute("data-in").split(" ").indexOf(f) > -1;
          c.hidden = !on; if (on) { n++; c.classList.remove("is-pop"); void c.offsetWidth; c.classList.add("is-pop"); }
        });
        if (live) live.textContent = n + " ingredients shown";
      });
    });
  });

  // ---------- Creatine story sections: reveal once in view ----------
  (function () {
    var secs = $$("[data-crf]"); if (!secs.length) return;
    if ((window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) || !("IntersectionObserver" in window)) return;
    document.documentElement.classList.add("js-crf");
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } }); }, { threshold: .25 });
    secs.forEach(function (s) { io.observe(s); });
  })();

  // ---------- Text and numbers on scroll: headings word by word, numbers count up ----------
  (function () {
    var reduce = (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) || !("IntersectionObserver" in window);
    if (reduce) return;
    $$(".crf__h, [data-words]").forEach(function (h) {
      if (h.classList.contains("is-split") || h.children.length) return;
      var words = h.textContent.trim().split(/\s+/);
      h.setAttribute("aria-label", h.textContent.trim());
      h.innerHTML = words.map(function (w, i) { return '<span class="w" aria-hidden="true" style="--w:' + i + '">' + w + (i < words.length - 1 ? " " : "") + "</span>"; }).join("");
      h.classList.add("is-split");
    });
    var nums = $$("[data-countup], .hl-row .num");
    nums = nums.filter(function (el) { return /\d/.test(el.textContent) && !el.children.length; });
    if (!nums.length) return;
    function run(el) {
      var txt = el.textContent, m = txt.match(/^(\D*?)([\d,]*\.?\d+)(.*)$/);
      if (!m) return;
      var end = parseFloat(m[2].replace(/,/g, "")), dec = (m[2].split(".")[1] || "").length, comma = m[2].indexOf(",") > -1;
      if (!end) return;
      var t0 = null, dur = Math.min(1600, 700 + end / 2);
      function fmt(v) { var s = v.toFixed(dec); return comma ? s.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : s; }
      el.style.minWidth = el.offsetWidth + "px";
      function step(t) { if (!t0) t0 = t; var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3); el.textContent = m[1] + fmt(end * e) + m[3]; if (p < 1) requestAnimationFrame(step); else el.textContent = txt; }
      requestAnimationFrame(step);
    }
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } }); }, { threshold: .6 });
    nums.forEach(function (n) { io.observe(n); });
  })();

  // ---------- Offer landing page: real countdown, sticky bar, discount code ----------
  $$("[data-ofr-clock]").forEach(function (el) {
    var end = +el.dataset.ends * 1000; if (!end) return;
    function pad(n) { return (n < 10 ? "0" : "") + n; }
    function tick() {
      var ms = end - Date.now(); if (ms <= 0) { el.hidden = true; return; }
      el.hidden = false; var s = Math.floor(ms / 1000);
      $('[data-u="d"]', el).textContent = Math.floor(s / 86400); $('[data-u="h"]', el).textContent = pad(Math.floor(s % 86400 / 3600));
      $('[data-u="m"]', el).textContent = pad(Math.floor(s % 3600 / 60)); $('[data-u="s"]', el).textContent = pad(s % 60);
      setTimeout(tick, 1000);
    }
    tick();
  });
  (function () {
    var bar = $("[data-ofr-sticky]"), hero = $(".ofr"), build = $("#build");
    if (!bar || !hero || !("IntersectionObserver" in window)) return;
    var vis = { hero: true, build: false };
    function upd() { var past = build && build.getBoundingClientRect().top < 0; bar.classList.toggle("is-on", !vis.hero && !vis.build && !past); }
    new IntersectionObserver(function (es) { vis.hero = es[0].isIntersecting; upd(); }, { threshold: 0 }).observe(hero);
    if (build) new IntersectionObserver(function (es) { vis.build = es[0].isIntersecting; upd(); }, { threshold: 0 }).observe(build);
    window.addEventListener("scroll", upd, { passive: true });
  })();
  $$("[data-ofr-code]").forEach(function (el) {
    var code = el.getAttribute("data-ofr-code"); if (!code) return;
    try { if (sessionStorage.getItem("ff-code") === code) return; sessionStorage.setItem("ff-code", code); } catch (e) {}
    fetch("/discount/" + encodeURIComponent(code) + "?redirect=" + encodeURIComponent("/cart.js"), { credentials: "same-origin" }).catch(function () {});
  });

  // ---------- Blog post: reading progress, table of contents, copy link, scrollable tables ----------
  $$("[data-article]").forEach(function (art) {
    var body = $("[data-art-body]", art), bar = $("[data-art-progress]");
    $$("table", body).forEach(function (t) { if (t.parentNode.classList.contains("art-table")) return; var w = document.createElement("div"); w.className = "art-table"; t.parentNode.insertBefore(w, t); w.appendChild(t); });
    if (bar) {
      var onScroll = function () { var r = body.getBoundingClientRect(), h = r.height - innerHeight * .6; var p = Math.min(1, Math.max(0, -r.top / (h > 0 ? h : 1))); bar.style.transform = "scaleX(" + p + ")"; };
      addEventListener("scroll", onScroll, { passive: true }); onScroll();
    }
    var toc = $("[data-art-toc]", art), hs = $$("h2", body);
    if (toc && hs.length > 1) {
      var ol = $("ol", toc), links = [];
      hs.forEach(function (h, i) {
        if (!h.id) h.id = "s-" + (i + 1) + "-" + h.textContent.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
        var li = document.createElement("li"), a = document.createElement("a"); a.href = "#" + h.id; a.textContent = h.textContent; li.appendChild(a); ol.appendChild(li); links.push(a);
      });
      toc.hidden = false;
      if ("IntersectionObserver" in window) {
        var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { links.forEach(function (l) { l.classList.toggle("is-on", l.getAttribute("href") === "#" + e.target.id); }); } }); }, { rootMargin: "-20% 0px -70% 0px" });
        hs.forEach(function (h) { io.observe(h); });
      }
    }
    var cp = $("[data-art-copy]", art);
    if (cp) cp.addEventListener("click", function () {
      var u = cp.dataset.url, done = function () { cp.textContent = "Copied"; setTimeout(function () { cp.textContent = "Copy link"; }, 1800); };
      if (navigator.clipboard) navigator.clipboard.writeText(u).then(done, done); else done();
    });
  });

  // ---------- Savings bar: pinned under the header ----------
  // A zero-height marker sits right above the bar. Pinned = the marker has scrolled above the bar's
  // sticky top. The marker never moves when the bar changes size, so there is no feedback loop.
  // When the bar condenses (phones), the height it gives up is kept as margin so the page below
  // stays exactly where it was.
  $$(".pd__buy [data-tiers]").forEach(function (tw) {
    var mark = document.createElement("i"); mark.setAttribute("aria-hidden", "true"); mark.style.cssText = "display:block;height:0;margin:0;padding:0";
    tw.parentNode.insertBefore(mark, tw);
    var on = false, full = 0, raf = 0;
    function apply() {
      raf = 0;
      var cs = getComputedStyle(tw), top = parseFloat(cs.top) || 0, mt = parseFloat(cs.marginTop) || 0;
      var now = mark.getBoundingClientRect().top + mt < top - 0.5;
      if (now !== on) {
        on = now;
        if (on) { full = tw.offsetHeight; tw.classList.add("is-stuck"); }
        else { tw.classList.remove("is-stuck"); tw.style.marginBottom = ""; }
      }
      if (on) tw.style.marginBottom = Math.max(0, full - tw.offsetHeight) + "px";
    }
    function req() { if (!raf) raf = requestAnimationFrame(apply); }
    addEventListener("scroll", req, { passive: true }); addEventListener("resize", req);
    if ("ResizeObserver" in window) new ResizeObserver(req).observe(tw);
    apply();
  });

  // ---------- "Jump to buy" buttons: smooth scroll to the buy box and flash it ----------
  (function () {
    var box = document.getElementById("buy"), btns = $$("[data-buy-cta]");
    if (!box) { btns.forEach(function (b) { b.hidden = true; }); return; }
    document.addEventListener("click", function (e) {
      var a = e.target.closest("[data-to-buy]"); if (!a) return;
      e.preventDefault();
      var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
      box.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      box.classList.remove("is-flash"); void box.offsetWidth;
      setTimeout(function () { box.classList.add("is-flash"); try { box.focus({ preventScroll: true }); } catch (x) {} }, reduce ? 0 : 650);
    });
  })();

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
    var gTimer = null;
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
      if (bag._p3d) { bag.style.transform = ""; bag._p3d.setAngle(-a); }
      else bag.style.transform = "rotateX(" + tilt.toFixed(2) + "deg) rotateY(" + a.toFixed(2) + "deg)";
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
    bag._p3dSync = function () { cur = -1; req(); };
    window.addEventListener("scroll", req, { passive: true });
    window.addEventListener("resize", function () { geom(); req(); });
    $$("img", bag).forEach(function (im) { if (!im.complete) im.addEventListener("load", req); });
    frame();
  });

  // ---------- Subscription demo (home) ----------
  var ui = $("[data-sub-ui]");
  if (ui) {
    var msgs = { skip: "Next box skipped.", swap: "Swapped flavors for the next box.", pause: "Paused. Restart from your account whenever you like.", gift: "Your next box ships to someone else, with your note." };
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

  // ---------- WebGL pouch: replaces the CSS pouch once three.js and the artwork are ready ----------
  (function () {
    var bags = $$("[data-p3d-front]");
    if (!bags.length || !FF.p3d) return;
    var modP = null;
    function loadMod() {
      return modP || (modP = new Promise(function (res, rej) {
        if (window.FFPouch3D) return res();
        var sc = document.createElement("script"); sc.src = FF.p3d.mod; sc.onload = res; sc.onerror = rej; document.head.appendChild(sc);
      }));
    }
    function go(bag) {
      loadMod().then(function () {
        if (!window.FFPouch3D || !FFPouch3D.supported()) return;
        var host = document.createElement("div"); host.className = "p3d"; host.setAttribute("aria-hidden", "true"); bag.appendChild(host);
        var rest = parseFloat(getComputedStyle(bag).getPropertyValue("--rest")) || 0;
        return FFPouch3D.mount(host, {
          three: FF.p3d.three, front: bag.getAttribute("data-p3d-front"), back: bag.getAttribute("data-p3d-back"),
          base: parseInt((bag.getAttribute("data-p3d-base") || "#e0833c").slice(1), 16),
          angle: bag.classList.contains("show-back") ? 180 : -rest
        }).then(function (c) { bag._p3d = c; bag.classList.add("is-3d"); if (bag._p3dSync) bag._p3dSync(); });
      }).catch(function () { $$(".p3d", bag).forEach(function (x) { x.parentNode.removeChild(x); }); });
    }
    if ("IntersectionObserver" in window) {
      var io3 = new IntersectionObserver(function (en) { en.forEach(function (x) { if (x.isIntersecting) { io3.unobserve(x.target); go(x.target); } }); }, { rootMargin: "400px 0px" });
      bags.forEach(function (b) { io3.observe(b); });
    } else bags.forEach(go);
  })();

  qbMount();
  if (drawer) refreshCart().catch(function () {});
})();
