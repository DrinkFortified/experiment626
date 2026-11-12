# Design

## World: The kitchen table at golden hour

Audience: moms who read every label before it reaches their family (see `mockups/site/RESEARCH-maha-moms.md`). They trust other moms, real routines and plain facts, and back away from anything that feels glossy, corporate, loud or political. The site should feel like a calm kitchen counter in late-afternoon light: warm linen, soft serif headlines, real photographs of real routines, and the full label laid out like a recipe card.

Replaces the earlier "itemized receipt" world (2026-11-11), which the owner rejected. Brand anchors kept: the Fortified wordmark, teal accent, Energy red and Everyday orange for the two formulas, Figtree for body text.

## Palette

| Token | Value | Use |
|---|---|---|
| `--paper` | #f7f1e7 | Page ground (warm linen) |
| `--paper-2` | #efe5d4 | Recessed bands, chips, inputs |
| `--card` | #fffcf6 | Cards, label card, order summary |
| `--ink` | #1d2925 | Text and dark sections (green-leaning navy) |
| `--ink-2` | #55605a | Secondary text (6.2:1 on paper) |
| `--teal` | #12a39a | Brand accent fills (bars, dots), never small text |
| `--teal-ink` | #0b6f69 | Teal text and the primary button |
| `--honey` | #e7a83e | Ratings, small highlights |
| `--energy` / `--energy-wash` | #c8102e / #f3d9d3 | Energy formula; wash for its grounds |
| `--everyday` / `--everyday-wash` | #f26a1b / #f9e1cc | Everyday formula; wash for its grounds |

Formula colors appear full strength only on small marks (chips, pack art). Large grounds use the washes with ink text.

## Type

- Display: Fraunces 600, sentence case, tracking -0.02em, line height 1.02 to 1.1. Warm, bookish, not shouting.
- Body and UI: Figtree 400 to 700, 17px body, measure under 68ch.
- Small labels: Figtree 700, 12 to 13px, letter spacing 0.06em, uppercase only for field labels.
- Prices and counts use tabular figures.

## Shape and depth

- Radius: 20px cards, 14px controls, pill buttons.
- Shadow: one soft warm shadow, `0 1px 2px rgba(60,40,20,.06), 0 12px 28px -14px rgba(60,40,20,.28)`.
- Hairlines `#e2d6c2` divide rows; no dashed or dotted receipt rules except the soft leaders in ingredient lists.

## Signature parts

- **Label card:** ingredient name left, source right, soft leaders, then a short "Never in our packs" list. Reads like a recipe card.
- **Golden-hour frame:** the hero and story photos sit in rounded frames with a warm gradient placeholder until real photography exists.
- **Proof slots:** reviews, mom stories and lab results get real, sized slots near the buy button. Nothing is invented.

## Motion

One authored moment: when packs are added on the product page, the order summary line that changed fades and slides in (240ms, ease-out). Buttons press to 0.97. Everything else is still. Reduced motion removes transforms.

## Purchase structure (owner approved, keep)

Product page buy column, top to bottom: name, one-line description, 10/15/20% Subscribe tier bar with the "add N more" line, packs per organic flavor with minus and plus steppers, Purchase label with a one-line plain-text explanation, Subscribe and One-time toggle showing each price, itemized order summary with savings, Add button. Desktop keeps the product visual in view while the column scrolls.

## Premium layer (owner asked for premium and personal, 2026-11-12)

- **Restraint over decoration:** hairlines and white space instead of cards, tints and dashed boxes. One dark button style, square corners (3px), tracked uppercase labels.
- **Type:** Fraunces drops to weight 300 to 400 with tight tracking; italic carries emphasis. A handwritten face (Caveat) appears only for the letter signature and one margin note.
- **Personal voice:** a short first-person letter sits right after the hero and is signed by hand. It uses only facts the brand stands behind; swap in the founder's own name and words when ready.
- **Product as still life:** until real photography exists, packs stand on a styled counter in window light (gradients and soft contact shadows) instead of empty placeholder frames.
- **Proof stays honest:** reviews and lab results are quiet italic lines that say where the real content goes. Nothing is invented.
- **Palette:** ivory #f5f0e7, oat #ece4d6, ink #1b2621, evergreen #1f4d45 for italic accents; formula colors only on the packs and small marks.

## Palette, revised from the competitor audit (2026-11-12)

Measured from Ballerina Farm, Branch Basics, Primal Kitchen, Primally Pure, Just Ingredients and Redmond (see `mockups/site/RESEARCH-maha-moms.md`). They share a bright warm cream base, one deep earthy anchor and one or two confident food-colored accents. Fortified's version:

| Token | Value | Use |
|---|---|---|
| `--paper` | #fdf9f2 | Bright cream page ground |
| `--paper-2` | #f6ecdc | Oat bands |
| `--ink` | #0b1c29 | Fortified navy: text, buttons, header bar, footer (the brand's own anchor) |
| `--accent` | #e2541f | Warm pack-orange for italic display type and highlights (large text only) |
| `--accent-ink` | #b8430f | Orange for small text: savings, "never", signature (5.2:1 on cream) |
| `--peach` | #f9e0c9 | Soft wash, selection, confirmations |
| teal | #00aba3 | Logo dot only, as on the live store |

Counter scenes warm toward peach and caramel. Replaces the ivory, oat and evergreen values above.

## Palette v3: competitor pattern plus the real pack colors (2026-11-12)

Supersedes the orange accent above. Keeps the audit's cream base and the navy anchor, takes the accents from the pouches.

| Token | Value | Source and use |
|---|---|---|
| `--paper` | #fdf9f2 | Cream base (competitor pattern) |
| `--paper-2` | #f8eedd | Oat bands |
| `--ink` | #0b1c29 | Fortified navy anchor: text, buttons, bar, footer |
| `--accent` | #c9476a | Berry-rose from the Energy pouch: italic display words, 20% figure |
| `--accent-ink` | #a83558 | Same hue for small text: savings, "never", signature |
| `--honey` | #eab044 | Everyday pouch: highlights, stars, the start of the savings bar gradient |
| `--butter` / `--rose-wash` | #fcefcd / #f8e1e7 | Everyday and Energy grounds; product stages take each pouch's tone |
| teal | #00aba3 | Logo dot only |

Imagery: real pouch renders (transparent) on styled counters, the brand's fruit photography for the formula tiles, and the actual back of the pouch beside the ingredient list. Files in `mockups/site/img/`, compressed to under 1MB total.

## Palette v4: measured segment colors (2026-11-12, current)

The owner judged v3 (navy and berry-rose) unlike any competitor. v4 takes every main color directly from the measured homepages and uses color in blocks the way those sites do. Verified by running the same area-weighted color measurement on the mockup: its top colors are #d4e0af, #f4e9a4, #f6c29f, #fdfaf4, #ddee9d, #0f4034, #ef5223, all measured values from the segment sites (see `mockups/site/screens/palette-comparison.png`).

| Token | Value | Measured on | Use |
|---|---|---|---|
| `--paper` | #fdfaf4 | Branch Basics | Page ground |
| `--ink` | #0f4034 | Primal Kitchen | Text, primary buttons, dark bands, footer |
| `--chartreuse` | #ddee9d | Branch Basics | Announcement bar, best-value tier, buttons on dark |
| `--lime` | #a5cf46 | Primal Kitchen | Savings bar fill |
| `--sage` | #d4e0af | Primal Kitchen | Label section band |
| `--butter` | #f4e9a4 | Primal Kitchen | Promise band, Everyday product stage |
| `--peach` | #f6c29f | Branch Basics | Proof band, Energy product stage, formula image tiles |
| `--tomato` | #ef5223 | Ballerina Farm | Logo dot, cart count, drop cap |
| `--accent` / `--accent-ink` | #c64a1c / #9c3a17 | tomato deepened for text contrast | Italic display words; small accent text |
| `--caramel` | #c47d3e | Ballerina Farm | Review stars |
