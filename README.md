# Fortified: Build Your Own Bundle landing

Fast, single-section Shopify landing page for subscribing to the **individual 30 Day Supply Packs** (Energy and Everyday, $59.00 one-time). Subscriptions run through **Loop** selling plans. Performance is shown as Coming Soon with a waitlist.

## Files
- `shopify/sections/fortified-bundle.liquid`: the section (markup, lightboxes, theme editor settings).
- `shopify/snippets/fortified-bundle-flavors.liquid`: outputs each variant with its Loop selling plans and prices.
- `shopify/assets/fortified-bundle.css` / `.js`: styles and logic (no dependencies, about 10 KB each).
- `shopify/templates/page.subscribe.json`: page template using the section.
- `preview/index.html`: static preview using the same CSS/JS (subscription prices simulated).

## Install
1. Copy the `shopify/` folders into your theme (or upload via Online Store > Themes > Edit code).
2. Create a page (for example "Subscribe") and set its template to `page.subscribe`.
3. In Loop, add a selling plan group (30/60/90 day, 10% off) to both 30 Day Supply Pack products. The page reads plans and prices from Shopify, so what is shown matches checkout.

## How checkout works
Selected packs are added with `/cart/add.js`, each line carrying its Loop `selling_plan`, then the shopper is sent to `/checkout`. Lines carry `_bundle` and `_bundle_tier` properties for reporting.

## Needs configuring outside this page
- **Free Shipping at 2+ packs** and **Free Creatine For Life at 3+ packs** are displayed only. Set them up in Loop (or Shopify discounts / shipping rules).
- Product inventory is currently 0, so adds will fail unless inventory is set or "continue selling when out of stock" is on.
- Optional: upload Supplement Facts images in the section settings for the View Label lightboxes.
