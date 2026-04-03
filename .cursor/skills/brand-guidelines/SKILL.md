---
name: brand-guidelines
description: Applies Anthropic's official brand colors and typography to any artifact that may benefit from Anthropic's look-and-feel. Use when brand colors, style guidelines, visual formatting, or company design standards apply — including HTML, CSS, React, SVG, PowerPoint, and documents.
license: Complete terms in LICENSE.txt
---

# Anthropic Brand Guidelines

Apply this skill whenever creating or styling any visual artifact in Anthropic's voice: web interfaces, slides, documents, dashboards, reports, or any designed output.

---

## 1. Color System

### Tokens

```
--color-dark:        #141413   Primary text, dark backgrounds, high-contrast elements
--color-light:       #faf9f5   Page backgrounds, text on dark, breathing room
--color-mid-gray:    #b0aea5   Secondary text, placeholders, dividers, metadata
--color-light-gray:  #e8e6dc   Subtle backgrounds, borders, inactive states
--color-orange:      #d97757   Primary accent — CTAs, highlights, active states, brand moments
--color-blue:        #6a9bcc   Secondary accent — links, informational, data, secondary actions
--color-green:       #788c5d   Tertiary accent — success, nature, supporting decoration
```

### Usage Rules

**Dark (`#141413`)**
Use for: body text on light backgrounds, dark-mode backgrounds, high-contrast headers, footer backgrounds.
Never use as: a decorative color, a background on top of which you place dark text.

**Light (`#faf9f5`)**
Use for: page/canvas backgrounds, white space, text on dark backgrounds, card surfaces.
It is a warm off-white — not pure white (`#ffffff`). Never substitute `#fff` as the background; the warmth is intentional.

**Mid Gray (`#b0aea5`)**
Use for: secondary labels, timestamps, captions, placeholder text, horizontal rules, icon fills on light backgrounds.
Never use as: primary text (too low contrast), accents, or anything that needs to draw attention.

**Light Gray (`#e8e6dc`)**
Use for: input borders, card borders, table dividers, tag backgrounds, skeleton loading states.
Never use as: text color, primary background on large areas (use `--color-light` instead).

**Orange (`#d97757`) — Primary Accent**
Use for: the single most important interactive or brand element per view. CTAs, active tab indicators, progress fills, key data callouts, hover underlines on links, logo accents.
Use sparingly — one or two instances per screen. When everything is orange, nothing is.
Never use as: background for large areas, error states (use a red), success states (use green).

**Blue (`#6a9bcc`) — Secondary Accent**
Use for: hyperlinks, secondary buttons, informational callouts, data visualization lines, seed/navigation controls, secondary interactive states.
Pairs naturally with orange — use blue for secondary actions when orange is the primary.
Never use as: the dominant accent when orange is already present (they compete).

**Green (`#788c5d`) — Tertiary Accent**
Use for: success indicators, nature/environment contexts, tertiary buttons, decorative supporting elements, badges.
Use it the least of the three accents. It recedes; it does not demand attention.
Never use as: a primary CTA, error state, or the dominant accent on a page.

### Color Combinations

| Context | Background | Text | Accent |
|---|---|---|---|
| Default light | `#faf9f5` | `#141413` | `#d97757` |
| Dark surface | `#141413` | `#faf9f5` | `#d97757` |
| Card on light | `#ffffff` | `#141413` | `#6a9bcc` |
| Subtle section | `#e8e6dc` | `#141413` | `#788c5d` |
| Sidebar/nav | `#141413` | `#faf9f5` | `#d97757` |

**Contrast check**: `#141413` on `#faf9f5` = 16.7:1 (AAA). `#d97757` on `#faf9f5` = 3.1:1 (AA large text only — never use orange as small body text).

---

## 2. Typography

### Typefaces

| Role | Font | Fallback | Source |
|---|---|---|---|
| Display / Headlines | Poppins | Arial, sans-serif | Google Fonts |
| Body / Reading | Lora | Georgia, serif | Google Fonts |
| Code / Monospace | Courier New | monospace | System |

**Poppins** is geometric, modern, and confident. Use it for everything that needs to be noticed: headings, labels, navigation, buttons, UI text, captions.

**Lora** is a transitional serif optimized for reading. Use it for anything meant to be read continuously: body copy, descriptions, article text, document prose.

**Never** use system-ui, Inter, Roboto, or Arial as a deliberate choice. They are fallbacks only.

### Type Scale

```
Display:   48–72px   Poppins  600   letter-spacing: -0.02em   line-height: 1.1
H1:        36–48px   Poppins  600   letter-spacing: -0.01em   line-height: 1.15
H2:        28–36px   Poppins  600   letter-spacing: 0         line-height: 1.2
H3:        20–24px   Poppins  500   letter-spacing: 0         line-height: 1.3
H4:        16–18px   Poppins  600   letter-spacing: 0.02em    line-height: 1.4  (often uppercase)
Body:      15–17px   Lora     400   letter-spacing: 0         line-height: 1.65
Small:     12–14px   Poppins  400   letter-spacing: 0.01em    line-height: 1.5
Label/UI:  12–13px   Poppins  500   letter-spacing: 0.06em    line-height: 1.4  (uppercase)
Code:      13–14px   Courier  400   letter-spacing: 0         line-height: 1.6
```

### Font Loading (HTML/CSS)

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&family=Lora:wght@400;500&display=swap" rel="stylesheet">
```

```css
:root {
  --font-display: 'Poppins', Arial, sans-serif;
  --font-body:    'Lora', Georgia, serif;
  --font-mono:    'Courier New', monospace;
}
```

---

## 3. Spacing & Layout

Anthropic's brand aesthetic favors generous negative space and clean structure. Crowded layouts feel off-brand.

**Base unit: 8px.** All spacing should be multiples of 8.

```
Micro:   4px    — icon padding, tight inline gaps
Small:   8px    — between label and input, icon + text
Default: 16px   — between UI elements, paragraph spacing
Medium:  24px   — between sections within a card
Large:   32px   — between cards, major sections
XL:      48px   — section breaks, hero padding
XXL:     64px+  — full-section vertical padding
```

**Border radius:**
- Inputs, tags, small elements: `6px`
- Cards, panels, modals: `12px`
- Buttons: `6px`
- Pill badges: `999px`

**Shadows** (light theme):
```css
--shadow-sm:  0 2px 8px rgba(20, 20, 19, 0.06);
--shadow-md:  0 8px 24px rgba(20, 20, 19, 0.10);
--shadow-lg:  0 20px 40px rgba(20, 20, 19, 0.12);
```

---

## 4. Implementation by Context

### HTML / CSS

```css
:root {
  --color-dark:       #141413;
  --color-light:      #faf9f5;
  --color-mid-gray:   #b0aea5;
  --color-light-gray: #e8e6dc;
  --color-orange:     #d97757;
  --color-blue:       #6a9bcc;
  --color-green:      #788c5d;

  --font-display: 'Poppins', Arial, sans-serif;
  --font-body:    'Lora', Georgia, serif;
  --font-mono:    'Courier New', monospace;
}

body {
  background: var(--color-light);
  color: var(--color-dark);
  font-family: var(--font-body);
  font-size: 16px;
  line-height: 1.65;
}

h1, h2, h3, h4, h5, h6,
button, label, nav, .ui-text {
  font-family: var(--font-display);
}

a { color: var(--color-blue); }
a:hover { color: var(--color-orange); }

.btn-primary {
  background: var(--color-orange);
  color: white;
  font-family: var(--font-display);
  font-weight: 500;
  border-radius: 6px;
  padding: 10px 20px;
  border: none;
  cursor: pointer;
}

.btn-secondary {
  background: var(--color-blue);
  color: white;
  /* same structure as btn-primary */
}
```

### React / JSX

```jsx
// styles.js or inline style object
const theme = {
  colors: {
    dark:      '#141413',
    light:     '#faf9f5',
    midGray:   '#b0aea5',
    lightGray: '#e8e6dc',
    orange:    '#d97757',
    blue:      '#6a9bcc',
    green:     '#788c5d',
  },
  fonts: {
    display: "'Poppins', Arial, sans-serif",
    body:    "'Lora', Georgia, serif",
    mono:    "'Courier New', monospace",
  }
};

// With Tailwind — use arbitrary values:
// bg-[#faf9f5] text-[#141413] font-[Poppins]
// accent-[#d97757]
```

### PowerPoint (python-pptx)

```python
from pptx.util import Pt
from pptx.dml.color import RGBColor

# Color constants
DARK       = RGBColor(0x14, 0x14, 0x13)
LIGHT      = RGBColor(0xFA, 0xF9, 0xF5)
MID_GRAY   = RGBColor(0xB0, 0xAE, 0xA5)
LIGHT_GRAY = RGBColor(0xE8, 0xE6, 0xDC)
ORANGE     = RGBColor(0xD9, 0x77, 0x57)
BLUE       = RGBColor(0x6A, 0x9B, 0xCC)
GREEN      = RGBColor(0x78, 0x8C, 0x5D)

def style_heading(run, size_pt=28):
    run.font.name = 'Poppins'
    run.font.bold = True
    run.font.size = Pt(size_pt)
    run.font.color.rgb = DARK

def style_body(run, size_pt=14):
    run.font.name = 'Lora'
    run.font.bold = False
    run.font.size = Pt(size_pt)
    run.font.color.rgb = DARK

def style_accent_shape(shape, accent=ORANGE):
    shape.fill.solid()
    shape.fill.fore_color.rgb = accent
    shape.line.color.rgb = accent
```

### Documents (Word / docx)

```python
from docx.shared import Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH

def apply_heading_style(paragraph, level=1):
    run = paragraph.runs[0] if paragraph.runs else paragraph.add_run()
    run.font.name = 'Poppins'
    run.font.bold = True
    run.font.size = Pt(28 if level == 1 else 20)
    run.font.color.rgb = RGBColor(0x14, 0x14, 0x13)

def apply_body_style(paragraph):
    for run in paragraph.runs:
        run.font.name = 'Lora'
        run.font.size = Pt(11)
        run.font.color.rgb = RGBColor(0x14, 0x14, 0x13)
    paragraph.paragraph_format.space_after = Pt(8)
```

---

## 5. Do / Don't

| ✓ Do | ✗ Don't |
|---|---|
| Use `#faf9f5` (warm off-white) as the default background | Substitute `#ffffff` for the background |
| Use orange for one primary CTA per view | Use all three accents at equal weight |
| Use Poppins for all UI text, buttons, labels | Use Inter, Roboto, or system-ui deliberately |
| Use Lora for body copy and reading-length text | Use Lora for UI labels, buttons, or navigation |
| Space elements in multiples of 8px | Use arbitrary spacing values |
| Keep mid-gray for secondary/metadata text only | Use mid-gray as a primary text color |
| Use orange as a hover state or active indicator | Use orange as large-area background fill |
| Let negative space breathe | Fill every available area with content or color |

---

## 6. Quick Reference Card

```
BACKGROUNDS      DARK TEXT        ACCENTS
#faf9f5 light    #141413 on light  #d97757 orange — primary
#141413 dark     #faf9f5 on dark   #6a9bcc blue   — secondary
#e8e6dc subtle   #b0aea5 secondary #788c5d green  — tertiary

FONTS
Poppins 600  → Display, H1, H2
Poppins 500  → H3, buttons, labels, UI
Poppins 400  → Small text, captions
Lora    400  → Body copy, descriptions, prose
Courier New  → Code, monospace

SPACING  4 · 8 · 16 · 24 · 32 · 48 · 64
RADIUS   inputs: 6px  cards: 12px  pills: 999px
```