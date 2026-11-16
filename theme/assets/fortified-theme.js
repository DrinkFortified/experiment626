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

  // ---------- Free Creatine For Life ----------
  // 1 free creatine is kept in the cart while it holds FF.creatineAt or more subscription
  // packs, on the plan matching the packs' delivery frequency, and removed below that.
  var CR = FF.creatine || null;
  function isCreatine(it) { return !!CR && +it.variant_id === +CR.id; }
  function subCount(cart) {
    var m = 0, q = 0;
    (cart.items || []).forEach(function (it) {
      if (isCreatine(it) || !it.selling_plan_allocation) return;
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
    if ((!want && !lines.length) || ok) return Promise.resolve({ cart: cart, changed: false });
    var updates = {}; lines.forEach(function (l) { updates[l.key] = 0; });
    var chain = lines.length ? post(FF.routes.cartUpdate || "/cart/update.js", { updates: updates }) : Promise.resolve();
    if (want) chain = chain.then(function () {
      var it = { id: +CR.id, quantity: 1, properties: { _ff_gift: "creatine" } };
      if (planId) it.selling_plan = +planId;
      return post(FF.routes.cartAdd, { items: [it] });
    });
    return chain.then(getCart).then(function (c) { return { cart: c, changed: true, added: want }; })
      .catch(function () { return getCart().then(function (c) { return { cart: c, changed: false }; }); });
  }

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
      body.innerHTML = progressHtml(0) + '<div class="empty"><b>' + esc((FF.text && FF.text.empty) || "Your box is empty.") + '</b></div><div style="display:grid;gap:10px"><a class="btn btn--money" href="/products/everyday">Shop Everyday</a><a class="btn btn--ghost" href="/products/energy">Shop Energy</a></div>';
      foot.innerHTML = ""; return;
    }
    var lines = cart.items.map(function (it, i) {
      if (isCreatine(it)) {
        var cimg = it.image ? '<img src="' + esc(it.image + (it.image.indexOf('?') > -1 ? '&' : '?') + 'width=160') + '" alt="" loading="lazy">' : "";
        return '<div class="cart-line cart-line--gift"><div class="pack">' + cimg + '</div><div><b>Free Creatine For Life</b><small>' + esc((FF.text && FF.text.creatine) || "Free with 3+ subscription packs") + '</small></div><div class="cart-line__price">FREE</div></div>';
      }
      var plan = it.selling_plan_allocation ? planLabel(it.selling_plan_allocation.selling_plan.name) : "One-time";
      var img = it.image ? '<img src="' + esc(it.image + (it.image.indexOf('?') > -1 ? '&' : '?') + 'width=160') + '" alt="" loading="lazy">' : "";
      var strike = it.original_line_price > it.final_line_price ? "<s>" + money(it.original_line_price) + "</s>" : "";
      return '<div class="cart-line" data-line="' + (i + 1) + '"><div class="pack">' + img + '</div>' +
        '<div><b>' + esc(shortTitle(it.product_title)) + '</b><small>' + esc(flavorName(it.variant_title || "")) + ' \u00b7 ' + esc(plan) + '</small><br>' +
        '<div class="qty"><button type="button" data-dec aria-label="Remove one">&minus;</button><output class="num">' + it.quantity + '</output><button type="button" data-inc aria-label="Add one">+</button></div></div>' +
        '<div class="cart-line__price">' + strike + money(it.final_line_price) + '</div></div>';
    }).join("");
    body.innerHTML = progressHtml(packs, subCount(cart).n) + lines;
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
      if (r.changed && r.added && !had) toast("Free Creatine For Life added to your box.");
      if (r.changed && !r.added && had) toast("Free Creatine needs 3 or more subscription packs.");
      renderCart(r.cart); return r;
    });
  }
  function refreshCart() { return getCart().then(settle).then(function (r) { return r.cart; }); }
  function changeLine(line, qty) {
    return post(FF.routes.cartChange, { line: line, quantity: qty }).then(settle)
      .catch(function () { toast("Could not update your box. Try again."); });
  }
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
    var tierRate = function (n) { return n >= 3 ? 0.20 : n === 2 ? 0.15 : 0.10; };

    // Unit price in cents for a variant on a plan, from Shopify's selling plan allocations.
    // Each variant carries its own product's plan ids, so Everyday and Energy can share one order.
    function planId(v, plan) { var id = plan === "q3" ? v.quarterly : plan === "sub" ? v.monthly : null; return id ? String(id) : null; }
    function unit(v, plan, n) {
      if (plan === "otp") return v.price;
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
      var ship = n >= (FF.freeShipAt || 2) ? "Free Shipping on this order." : "Free Shipping from " + (FF.freeShipAt || 2) + " packs.";
      var creAt = FF.creatineAt || 3, creOn = st.plan !== "otp" && n >= creAt;
      var cre = creOn ? "Free Creatine For Life included." : "Free Creatine For Life with " + creAt + " or more packs" + (n ? " (add " + (creAt - n) + " more)." : ".");
      var note = st.plan === "q3" ? "<b>Every 3 months:</b> ships every 90 days, any number of packs, " + P.quarterlyPct + "% off. " + cre + " Skip or cancel online anytime. " + ship
        : st.plan === "sub" ? "<b>Monthly:</b> " + (P.volumeTiers ? "up to 20%" : P.monthlyPct + "%") + " off every order, ships every 30 days. " + cre + " Skip or cancel online anytime. " + ship
        : "<b>One-time:</b> full price, one delivery, no subscription. " + ship;
      $("[data-plan-note]", pd).innerHTML = note;
      // Savings bar
      var on1 = st.plan !== "otp", on2 = n >= (FF.freeShipAt || 2), on3 = st.plan === "q3";
      $$("[data-tier]", pd).forEach(function (t) { var k = +t.dataset.tier; var on = k === 1 ? on1 : k === 2 ? on2 : on3; t.classList.toggle("is-on", on); t.classList.toggle("is-next", !on && (k === 2 ? on1 : k === 3 ? on1 && on2 : true)); });
      var tm = $("[data-tiers-msg]", pd);
      if (tm) tm.innerHTML = st.plan === "otp" ? "Savings and Free Creatine For Life come with a subscription."
        : !creOn ? "Add " + (creAt - n) + " more " + (creAt - n === 1 ? "pack" : "packs") + " for <b>Free Creatine For Life</b>."
        : st.plan === "q3" ? "<b>Best value unlocked:</b> " + P.quarterlyPct + "% off and Free Creatine For Life." : "Free Creatine For Life unlocked. Switch to <b>Every 3 months</b> for " + P.quarterlyPct + "% off.";
      // Receipt
      var rc = $("[data-pd-receipt]", pd), html = "";
      Object.keys(st.q).forEach(function (id) { if (st.q[id]) html += '<li class="item"><span class="item__name">' + st.q[id] + "\u00d7 " + esc((V[id].formula ? V[id].formula + " " : "") + flavorName(V[id].title)) + '</span><span class="item__lead"></span><span class="item__val">' + money(V[id].price * st.q[id]) + "</span></li>"; });
      if (save > 0) html += '<li class="item item--save"><span class="item__name">Subscription savings</span><span class="item__lead"></span><span class="item__val">&minus;' + money(save) + "</span></li>";
      if (creOn) html += '<li class="item item--add"><span class="item__name">Free Creatine For Life</span><span class="item__lead"></span><span class="item__val">FREE</span></li>';
      html += '<li class="item"><span class="item__name">Shipping</span><span class="item__lead"></span><span class="item__val">' + (on2 ? "FREE" : "At checkout") + "</span></li>";
      rc.innerHTML = html;
      $("[data-pd-receipt-meta]", pd).textContent = st.plan === "q3" ? "Every 3 months" : st.plan === "sub" ? "Monthly" : "One-time";
      $("[data-pd-price]", pd).innerHTML = (save > 0 ? "<s>" + money(full) + "</s>" : "") + money(tot);
      var sv = $("[data-pd-save]", pd); sv.textContent = save > 0 ? "You save " + money(save) : ""; sv.hidden = !(save > 0);
      var perk = $("[data-pd-perk]", pd); if (perk) perk.textContent = on2 ? "Free Shipping" : "Free Shipping at " + (FF.freeShipAt || 2) + "+";
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

  // ---------- Subscription demo (home) ----------
  var ui = $("[data-sub-ui]");
  if (ui) {
    var msgs = { skip: "Next box skipped.", swap: "Swapped organic flavors for the next box.", delay: "Delivery moved to every 3 months.", cancel: "Cancelled. You can restart anytime." };
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

  if (drawer) refreshCart().catch(function () {});
})();
