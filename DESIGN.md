# Design

## World: The Itemized Receipt

Fortified's claim is that nothing is hidden. A receipt is the everyday object that proves it: every line accounted for, a total you can check, printed for you to keep. The site is built on receipt paper. The label is the receipt for what is in the pack, and the cart is the receipt for what you are buying, and both print in front of the visitor.

Seed: seed:d73d3ec503b81724 (assigned direction 4 of 7, degraded roll: no challengers, the roll service was unreachable). Top-ranked alternative kept on file: a Supplement Facts panel world (hairline and heavy rules, label grammar).

## Palette (owner-pinned brand colors)

| Token | Value | Use |
|---|---|---|
| `--paper` | #fbfaf5 | Page ground, receipt paper |
| `--paper-2` | #f1efe6 | Second ground, recessed areas |
| `--ink` | #0e1a24 | Navy ink: text, rules, dark sections |
| `--ink-2` | #46525c | Secondary text on paper (7.3:1) |
| `--teal` | #12a39a | Brand accent, focus, totals, unlocked rewards. Large text and fills only on paper |
| `--teal-ink` | #0b7d76 | Teal for small text on paper (4.9:1) |
| `--energy` | #c8102e | Energy formula field |
| `--everyday` | #f26a1b | Everyday formula field; text on it is navy, never white |
| `--performance` | #121212 | Performance (coming soon) field |

White text on Everyday orange fails contrast, so orange fields always carry navy ink.

## Type

Figtree only (owner-pinned). Display: 900, uppercase, tracking -0.03em, line-height 0.92. Body: 400 to 600, 17px, measure under 70ch. Prices, quantities and amounts use `font-variant-numeric: tabular-nums` so receipt columns align. No monospace.

## Signature parts

- **Receipt sheet:** paper card with a torn zigzag top and bottom edge (CSS mask), soft offset shadow, dotted leader lines between item and value, a double rule above totals.
- **Itemized line:** name left, dotted leader, source or price right. Voided lines (struck through, marked VOID) list what is not in the pack.
- **Formula fields:** Energy red and Everyday orange as full-bleed grounds, never as accents on cards.
- **Stamp:** a rotated outline stamp ("NOTHING HIDDEN", "PAID IN FULL") used once per page at most.

## Motion

One authored moment: printing. Receipt lines feed in from the top, staggered 40ms, 260ms, ease-out-expo, once per sheet on first view, and new cart lines print in when added. Hover: buttons press to scale 0.97, links draw their underline. Everything else stays still. `prefers-reduced-motion` removes the feed and keeps fades only.

## Components

Buttons: navy pill-free rectangles with 10px radius, 56px tall primary, teal for the money action. Segmented toggles for formula and organic flavor. Cart is a receipt drawer from the right; checkout is a single sheet.
