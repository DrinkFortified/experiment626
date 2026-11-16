# Fortified Shopify theme

A complete Online Store 2.0 theme built from the mockup in `mockups/site`. White background, live store colors (navy #0b1c29, teal #00aba3, orange #f76515, sky #7eb8c8), Bricolage Grotesque and Figtree type.

## Install

1. Shopify admin > Online Store > Themes > Add theme > Upload zip file, and choose `fortified-theme.zip` from the repo root. It installs **unpublished**.
2. Click **Customize** to preview and edit every section (text, images, ticker claims, FAQ, ingredients).
3. Optional pages: create pages with handles `ingredients`, `about` and `help`, and assign the templates `page.ingredients`, `page.about` and `page.help`.
4. Menus: the header uses `main-menu` and the footer uses `footer`. If those are empty, built-in links to Everyday, Energy, Ingredients, About and Help are shown.
5. Publish when it looks right.

Or with the Shopify CLI: `shopify theme push --unpublished --path theme`.

## How the buy box works

- Each product's variants (the organic flavors) get a minus and plus stepper.
- The other formula is listed underneath (Everyday shows Energy, Energy shows Everyday) so both can go in one order. Each item is added with its own product's selling plan. The other product's handle is detected automatically and can be set in the section settings.
- Images: each flavor uses the transparent pouch render whose file name contains "Front" and the flavor (ORG or WTM). If none is found it falls back to the variant image.
- The purchase toggle reads the product's Loop selling plans. The plan whose name contains 90, "3 month" or "quarter" becomes **Every 3 months**; the other becomes **Monthly**. One-time is hidden if the product requires a subscription.
- Prices come from Shopify's selling plan allocations, so the page shows exactly what checkout charges. With the current Loop setup that is Monthly 10% ($53.10) and Every 3 months 20% ($47.20).
- Every 3 months is only a delivery frequency: any number of packs, no minimum.
- **Add to box** posts all flavors in one request to `/cart/add.js` with the selling plan id, then opens the cart drawer, which reads and updates the real cart (`/cart.js`, `/cart/change.js`). Checkout goes to Shopify checkout.

## Free Creatine For Life

- When the cart holds 3 or more subscription packs (Monthly or Every 3 months, Everyday and Energy combined), the theme adds 1 creatine (`/products/creatine`, $0) automatically. Below 3 it removes it. One-time packs do not count.
- It is added on the creatine product's matching Loop plan: "Monthly Creatine" when most packs are Monthly, "Quarterly Creatine" when most are Every 3 months.
- This runs on every page load, after Add to box, and after every quantity change in the cart drawer or cart page. Settings: Theme settings > Offers (pack count, on/off, creatine product).
- It is enforced by the theme only. Anyone can still add the $0 creatine with a direct cart link, so add a Shopify cart and checkout validation rule if that matters.

## Settings (Theme settings > Offers)

- Free Shipping and Free Creatine For Life pack counts drive the progress messages only. Set real shipping rates and the creatine offer in Shopify and Loop.
- "Show 10 / 15 / 20% volume tiers" is off by default because Loop does not currently have quantity tiers. Turn it on only after a matching quantity discount exists.

## Tested

- Shopify Theme Check: 0 errors (3 warnings for loading Google Fonts).
- Buy box and cart drawer driven in Chromium with the live Everyday product data and a simulated cart API: correct prices for each plan, correct variant ids, quantities and selling plan ids sent, drawer totals correct.
- Not yet tested on the real store. Preview it unpublished before going live.

## Before publishing

- Upload reviews app blocks into the product section (it accepts app blocks).
- Confirm the Free Creatine For Life terms and the 30-day guarantee wording.
- Keep the "Front" pouch renders on each product: the stage and flavor rows use them.
