# Fortified full-site mockup

Static HTML, CSS and vanilla JS. Open `index.html` in a browser. Nothing is submitted or charged.

## Pages
| File | Page |
|---|---|
| `index.html` | Home: interactive label receipt in the hero, formula fork, pack rewards, label proof, subscription controls, guarantee, FAQ |
| `shop.html` | Build a box: pack count, formula and organic flavor per pack, Subscribe & Save cadence, live receipt, express pay |
| `product.html?f=energy` / `?f=everyday` | Product page: buy box, full receipt, directions, other formula, FAQ |
| `ingredients.html` | Full ingredient table with sources, what each formula adds, voided items, Supplement Facts slots |
| `about.html` | House rules and founder story slots |
| `help.html` | Contact, grouped FAQ (products, subscriptions, shipping, guarantee) |
| `performance.html` | Coming soon waitlist |

Shared on every page (`site.js`): header, footer, cart receipt drawer, one-page checkout, order confirmation.

## Design system
See `PRODUCT.md` and `DESIGN.md` at the repo root. World: the itemized receipt. Brand colors and Figtree are unchanged.

## Before launch
- Replace placeholder slots: verified reviews, Supplement Facts images, lifestyle photography, founder portrait and story.
- Confirm Free Creatine For Life terms and serving directions.
- Have the footer FDA disclaimer and all product copy reviewed against the approved label.
- Port to the Shopify theme: the builder and buy box should post to `/cart/add.js` with Loop `selling_plan` IDs, as `shopify/assets/fortified-bundle.js` already does.
