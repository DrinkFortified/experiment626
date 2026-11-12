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
