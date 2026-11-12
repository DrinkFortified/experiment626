# Product

<!-- impeccable:product-schema 1 -->

> Written from repository evidence and the owner's brief. The owner asked to proceed without the init interview, so every line marked *(inferred)* is an assumption to confirm.

## Platform

web

## Stack

Delegated: static HTML, CSS and vanilla JS mockups under `mockups/`, built to be ported into the existing Shopify theme sections under `shopify/` (Liquid sections, Loop subscription selling plans). No framework.

## Users

- Adults who drink an electrolyte daily and read supplement labels before they buy. They distrust proprietary blends and hype. *(inferred from copy: "for people who actually read the label")*
- Two jobs: a morning or pre-workout drink with caffeine (Energy), and an all-day caffeine-free drink (Everyday). *(inferred)*
- Most arrive on a phone from social or paid ads and decide in one session. *(inferred)*

## Product Purpose

Fortified sells clean electrolyte drink mixes as 30 Day Supply Packs, mainly on subscription. Success is a first subscription order with 2+ packs, and keeping subscribers by making skip, swap and cancel easy.

## Positioning

Radical label transparency: every ingredient named with its source, no proprietary blends, no fear-mongering marketing. "Hydration. No Mumbo Jumbo."

## Operating Context

- Shopify storefront with Loop subscriptions (30, 60 or 90 day cadence, 10% off). Shoppers manage subscriptions online under My Subscriptions.
- Ships within 1 to 3 business days to all 50 US states and DC; ground delivery usually 3 to 7 business days.
- Support: hello@livefortified.com, (888) 688-8351.

## Capabilities and Constraints

- **Energy:** higher-sodium electrolyte formula plus 150mg natural caffeine from coffee bean. Badge: Caffeine.
- **Everyday:** daily electrolyte formula plus Vitamin D3 and Vitamin K2 (MK-7). Badge: Caffeine-Free.
- **Performance:** coming soon, 5g creatine plus electrolytes. Waitlist only.
- **Organic flavors:** Organic Salty Watermelon and Organic Salty Orange, for both formulas. Always say "Organic" with a flavor name.
- **Shared base:** Pink Himalayan Salt (as Ancient Ocean), Magnesium Malate, Coconut Water Powder (as CocOganic Plus), Potassium Chloride, Bamboo Fiber, Organic Lemon Juice Powder. Sweetened with Monk Fruit Extract and Reb M (as OnoSweet).
- **Price:** $59.00 per 30 Day Supply Pack one-time (full price). Subscribe tiers by total packs in the order (owner, 2026-11-12): 1 pack 10% off ($53.10), 2 packs 15% off ($100.30), 3+ packs 20% off ($141.60 for 3). The option is labeled "Subscribe".
- **Offers:** Free Creatine For Life at 3+ packs, Subscribe only (terms not yet confirmed; must not be described beyond its name). Free Shipping at 2+ packs on any order *(kept from the previous offer; confirm)*.
- **Guarantee:** contact within 30 days of delivery for a refund of the purchase price, no return required. A refund does not cancel the subscription on its own.
- Inventory is currently 0 in Shopify; offers above are display-only until configured in Loop.

## Brand Commitments

- Name: FORTIFIED (registered mark, FORTIFIED®).
- Brand colors in use: teal #12a39a, navy #0e1a24, Energy red #c8102e, Everyday orange #f26a1b, Performance black #121212. Owner asked to keep the same colors.
- Typeface in use: Figtree.
- Voice: plain, direct, a little dry. Short sentences. No hype, no fear. Copy uses no em dashes or en dashes.

## Evidence on Hand

- Product pack photos on the Shopify CDN for all four formula and organic flavor combinations (see `preview/index.html`).
- Full ingredient list and Supplement Facts structure (see `shopify/sections/fortified-bundle.liquid`).
- **Absent, must not be fabricated:** customer reviews, star ratings, customer counts, testimonials, press logos, founder story, lifestyle photography, clinical or performance claims, exact mg per serving for electrolytes, Free Creatine For Life terms.

## Product Principles

1. Show the label before the claim. Proof is the ingredient list itself.
2. Every page leads to the bundle builder within one tap.
3. Subscription is the default, and leaving it is easy and stated up front.
4. Never imply health outcomes the label does not support.
5. Mix and match is the product; the formula choice should feel like a simple fork, not a quiz.

## Accessibility & Inclusion

WCAG 2.1 AA for contrast, keyboard use and touch targets (44px minimum). *(inferred standard)*
