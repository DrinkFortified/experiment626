/* Fortified: Build Your Own Bundle (Shopify + Loop selling plans) */
(function () {
  'use strict';

  var MAX_QTY = 10;
  var CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

  function h(tag, attrs, children) {
    var el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v == null || v === false) return;
        if (k === 'text') el.textContent = v;
        else if (k === 'html') el.innerHTML = v;
        else if (k === 'class') el.className = v;
        else el.setAttribute(k, v === true ? '' : v);
      });
    }
    (children || []).forEach(function (c) { if (c) el.appendChild(c); });
    return el;
  }

  function formatMoney(cents, format) {
    format = format || '${{amount}}';
    var value = (cents / 100).toFixed(2);
    var parts = value.split('.');
    var withCommas = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return format.replace(/\{\{\s*(\w+)\s*\}\}/, function (_, key) {
      if (key === 'amount_no_decimals') return withCommas;
      if (key === 'amount_with_comma_separator') return parts[0] + ',' + parts[1];
      return withCommas + '.' + parts[1];
    });
  }

  // Turn a Loop selling plan name/option ("Deliver every 30 days", "1 month") into days.
  function planDays(plan) {
    var text = String(plan.days || plan.name || '').toLowerCase();
    var m = text.match(/(\d+)\s*(day|week|month)/);
    if (!m) { var n = text.match(/\d+/); return n ? parseInt(n[0], 10) : null; }
    var num = parseInt(m[1], 10);
    if (m[2] === 'week') return num * 7;
    if (m[2] === 'month') return num * 30;
    return num;
  }

  function init(root) {
    var cfgEl = root.querySelector('[data-fb-config]');
    if (!cfgEl) return;
    var cfg = JSON.parse(cfgEl.textContent);
    var money = function (c) { return formatMoney(c, cfg.moneyFormat); };
    var discount = Number(cfg.discountPercent) || 0;
    var tiers = cfg.tiers || [];

    // Flatten sellable flavors and normalize their plans.
    var items = [];
    cfg.lines.forEach(function (line) {
      (line.flavors || []).forEach(function (f) {
        f.line = line;
        f.qty = 0;
        f.plans = (f.plans || []).map(function (p) {
          return { id: p.id, price: p.price, days: planDays(p) };
        });
        items.push(f);
      });
    });

    // Frequencies offered = those every flavor has a plan for.
    var freqs = (cfg.frequencies || [30]).filter(function (d) {
      return items.every(function (f) { return f.plans.some(function (p) { return p.days === d; }); });
    });
    var hasPlans = cfg.previewMode || items.every(function (f) { return f.plans.length; });
    if (cfg.previewMode && !freqs.length) freqs = cfg.frequencies || [30];
    if (!hasPlans && window.console) console.warn('[Fortified bundle] No Loop selling plans found on one or more variants. Subscribe button falls back to one-time purchase.');
    var state = { freq: freqs.indexOf(cfg.defaultFrequency) > -1 ? cfg.defaultFrequency : freqs[0] };

    function planFor(f) {
      if (!f.plans.length) return null;
      return f.plans.filter(function (p) { return p.days === state.freq; })[0] || f.plans[0];
    }
    function subPrice(f) {
      var p = planFor(f);
      if (p && p.price != null) return p.price;
      return Math.round(f.price * (100 - discount) / 100);
    }

    /* ---------- Render tiers ---------- */
    var stepsEl = root.querySelector('[data-fb-steps]');
    var fill = h('span', { class: 'fb__steps-fill', 'aria-hidden': 'true' });
    stepsEl.appendChild(fill);
    var stepEls = tiers.map(function (t) {
      var perks = h('div', { class: 'fb__perks' }, (t.perks || []).map(function (p) { return h('div', { text: '+ ' + p }); }));
      var li = h('li', { class: 'fb__step' }, [
        h('span', { class: 'fb__dot', html: CHECK }),
        h('span', { class: 'fb__step-name', text: t.name }),
        t.pill ? h('span', { class: 'fb__pill', text: t.pill }) : null,
        perks
      ]);
      stepsEl.appendChild(li);
      return li;
    });

    /* ---------- Render product lines ---------- */
    var linesEl = root.querySelector('[data-fb-lines]');
    cfg.lines.forEach(function (line) {
      var head = h('div', { class: 'fb__line-head' }, [
        h('h3', { class: 'fb__line-name', text: line.name }),
        h('p', { class: 'fb__line-desc', text: line.desc })
      ]);
      var body;
      if (line.comingSoon) {
        body = h('div', { class: 'fb__soon' }, [
          h('span', { class: 'fb__soon-tag', text: 'Coming Soon' }),
          h('p', { text: line.soonText || '' }),
          h('button', { type: 'button', class: 'fb__add', 'data-fb-open': line.waitlistDialog, text: 'Notify Me' })
        ]);
      } else {
        body = h('div', { class: 'fb__cards' }, line.flavors.map(renderCard));
      }
      linesEl.appendChild(h('section', { class: 'fb__line fb__line--' + line.key, 'aria-label': line.name }, [head, body]));
    });

    function renderCard(f) {
      var qtyWrap = h('div', { class: 'fb__qty-slot' });
      var card = h('article', { class: 'fb__card' }, [
        h('div', { class: 'fb__card-media' }, [
          f.image ? h('img', { src: f.image, alt: f.line.name + ' ' + f.flavor, loading: 'lazy', width: '400', height: '400' }) : null,
          f.line.badge ? h('span', { class: 'fb__badge', text: f.line.badge }) : null
        ]),
        h('div', { class: 'fb__card-body' }, [
          h('h4', { class: 'fb__flavor', text: f.flavor }),
          h('p', { class: 'fb__tagline', text: f.tagline || '' }),
          h('button', { type: 'button', class: 'fb__link', 'data-fb-open': f.line.labelDialog, text: 'View Label' }),
          qtyWrap
        ])
      ]);
      f.card = card;
      f.slot = qtyWrap;
      paintQty(f);
      return card;
    }

    function paintQty(f) {
      f.slot.innerHTML = '';
      f.card.classList.toggle('is-picked', f.qty > 0);
      var label = f.line.name + ' ' + f.flavor;
      if (f.qty === 0) {
        var add = h('button', { type: 'button', class: 'fb__add', 'aria-label': 'Add ' + label, text: 'Add' });
        add.addEventListener('click', function () { setQty(f, 1, true); });
        f.slot.appendChild(add);
        return;
      }
      var minus = h('button', { type: 'button', 'aria-label': 'Remove one ' + label, text: '−' });
      var plus = h('button', { type: 'button', 'aria-label': 'Add one ' + label, text: '+', disabled: f.qty >= MAX_QTY });
      var out = h('output', { 'aria-live': 'polite', text: String(f.qty) });
      minus.addEventListener('click', function () { setQty(f, f.qty - 1, f.qty - 1 === 0); });
      plus.addEventListener('click', function () { setQty(f, f.qty + 1); });
      f.slot.appendChild(h('div', { class: 'fb__qty', role: 'group', 'aria-label': label + ' quantity' }, [minus, out, plus]));
    }

    function setQty(f, q, refocus) {
      f.qty = Math.max(0, Math.min(MAX_QTY, q));
      paintQty(f);
      if (refocus) { var b = f.slot.querySelector('button:last-child'); if (b) b.focus(); }
      update();
    }

    /* ---------- Frequency ---------- */
    var freqEl = root.querySelector('[data-fb-freq]');
    if (freqEl) {
      if (!hasPlans || freqs.length < 2) freqEl.hidden = true;
      freqs.forEach(function (d) {
        var input = h('input', { type: 'radio', name: 'fb-freq', value: String(d), checked: d === state.freq });
        input.addEventListener('change', function () { state.freq = d; update(); });
        freqEl.appendChild(h('label', null, [input, h('span', { text: 'Every ' + d + ' days' })]));
      });
    }

    /* ---------- Summary ---------- */
    var $ = function (s) { return root.querySelectorAll(s); };
    var ctas = $('[data-fb-cta]');
    var otp = root.querySelector('[data-fb-otp]');
    var sticky = root.querySelector('[data-fb-sticky]');
    var errorEl = root.querySelector('[data-fb-error]');

    function totals() {
      var count = 0, full = 0, sub = 0;
      items.forEach(function (f) { count += f.qty; full += f.price * f.qty; sub += subPrice(f) * f.qty; });
      return { count: count, full: full, sub: sub };
    }

    function activeTierIndex(count) {
      var idx = -1;
      tiers.forEach(function (t, i) { if (count >= t.min) idx = i; });
      return idx;
    }

    function update() {
      var t = totals();
      var ti = activeTierIndex(t.count);
      stepEls.forEach(function (el, i) { el.classList.toggle('is-on', i <= ti); });
      fill.style.width = tiers.length > 1 ? (Math.max(ti, 0) / (tiers.length - 1)) * 66.66 + '%' : '0';

      var next = tiers[ti + 1];
      var nudge = '';
      if (t.count === 0) nudge = cfg.copy.emptyNudge;
      else if (next) {
        var need = next.min - t.count;
        nudge = 'Add ' + need + ' more pack' + (need > 1 ? 's' : '') + ' to unlock ' + (next.perks || []).slice(-1)[0];
      } else nudge = cfg.copy.maxNudge;
      $('[data-fb-nudge]').forEach(function (el) { el.textContent = nudge; });

      var subscribe = hasPlans;
      $('[data-fb-full]').forEach(function (el) { el.textContent = subscribe && t.count ? money(t.full) : ''; el.hidden = !(subscribe && t.count); });
      $('[data-fb-total]').forEach(function (el) { el.textContent = money(subscribe ? t.sub : t.full); });
      $('[data-fb-pill]').forEach(function (el) { el.hidden = !subscribe || !discount; el.textContent = discount + '% OFF'; });
      $('[data-fb-count]').forEach(function (el) { el.textContent = t.count + ' pack' + (t.count === 1 ? '' : 's'); });

      ctas.forEach(function (b) {
        b.disabled = t.count === 0;
        var base = subscribe ? cfg.copy.ctaSubscribe : cfg.copy.ctaOneTime;
        b.textContent = t.count === 0 ? cfg.copy.ctaEmpty : b.hasAttribute('data-fb-short') ? base : base + ' - ' + money(subscribe ? t.sub : t.full);
      });
      if (otp) {
        otp.hidden = !subscribe;
        otp.disabled = t.count === 0;
        otp.textContent = 'One-Time Purchase - ' + money(t.count ? t.full : (items[0] ? items[0].price : 0));
      }
      $('[data-fb-freq-text]').forEach(function (el) { el.textContent = state.freq ? 'every ' + state.freq + ' days' : ''; });
      if (sticky) sticky.classList.toggle('is-visible', t.count > 0);
      errorEl.textContent = '';
    }

    /* ---------- Add to cart (Shopify AJAX Cart API) ---------- */
    function submit(subscribe, btn) {
      var t = totals();
      if (!t.count) return;
      var tier = tiers[activeTierIndex(t.count)];
      var payload = {
        items: items.filter(function (f) { return f.qty > 0; }).map(function (f) {
          var line = { id: f.variantId, quantity: f.qty, properties: { _bundle: 'fortified-byob', _bundle_tier: tier ? tier.name : '' } };
          var plan = subscribe ? planFor(f) : null;
          if (plan) line.selling_plan = plan.id;
          return line;
        })
      };

      if (cfg.previewMode) {
        var pre = document.getElementById('fb-preview-payload');
        if (pre) { pre.textContent = JSON.stringify(payload, null, 2); openDialog('fb-preview'); }
        return;
      }

      var root_ = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';
      var label = btn.textContent;
      btn.disabled = true;
      btn.textContent = cfg.copy.adding;
      fetch(root_ + 'cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload)
      }).then(function (r) {
        return r.json().then(function (j) { if (!r.ok) throw new Error(j.description || j.message || 'Could not add to cart'); return j; });
      }).then(function () {
        window.location.href = cfg.checkoutUrl || root_ + 'checkout';
      }).catch(function (err) {
        errorEl.textContent = err.message;
        btn.disabled = false;
        btn.textContent = label;
      });
    }

    ctas.forEach(function (b) { b.addEventListener('click', function () { submit(hasPlans, b); }); });
    if (otp) otp.addEventListener('click', function () { submit(false, otp); });

    update();
  }

  /* ---------- Lightboxes (native <dialog>) ---------- */
  function openDialog(id) {
    var d = document.getElementById(id);
    if (!d) return;
    if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', '');
  }
  document.addEventListener('click', function (e) {
    var opener = e.target.closest('[data-fb-open]');
    if (opener) { e.preventDefault(); openDialog(opener.getAttribute('data-fb-open')); return; }
    var closer = e.target.closest('[data-fb-close]');
    if (closer) { closer.closest('dialog').close(); return; }
    if (e.target.tagName === 'DIALOG' && e.target.classList.contains('fb-dialog')) e.target.close();
  });

  function boot() {
    document.querySelectorAll('[data-fb]').forEach(init);
    if (/[?&]customer_posted=true/.test(location.search)) openDialog('fb-waitlist');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
