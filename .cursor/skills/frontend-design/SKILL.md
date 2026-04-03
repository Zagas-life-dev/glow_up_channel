---
name: frontend-design
description: Create distinctive, production-grade frontend interfaces with high design quality. Use this skill when the user asks to build web components, pages, artifacts, posters, or applications (examples include websites, landing pages, dashboards, React components, HTML/CSS layouts, or when styling/beautifying any web UI). Generates creative, polished code and UI design that avoids generic AI aesthetics.
license: Complete terms in LICENSE.txt
---

This skill guides creation of distinctive, production-grade frontend interfaces that avoid generic "AI slop" aesthetics. Implement real working code with exceptional attention to aesthetic details and creative choices.

The user provides frontend requirements: a component, page, application, or interface to build. They may include context about the purpose, audience, or technical constraints.

---

## Step 1: Design Thinking (Do This Before Writing Code)

Answer these four questions internally before touching any code:

1. **Purpose** — What problem does this solve? Who uses it, and in what context?
2. **Tone** — Pick ONE extreme and commit. Examples below, but invent your own direction:
   - *Brutalist/raw*: Stark contrast, exposed structure, no decoration, heavy type
   - *Luxury/refined*: Generous whitespace, restrained palette, exquisite typography, no noise
   - *Retro-futuristic*: CRT glow, scanlines, terminal aesthetics, neon on dark
   - *Editorial/magazine*: Strong grid, oversized pull quotes, layered type, photographic
   - *Organic/natural*: Irregular shapes, earthy tones, handwritten or serif type, soft edges
   - *Maximalist*: Layered textures, competing typographic scales, controlled visual chaos
   - *Toy-like/playful*: Thick borders, bold primaries, bouncy motion, chunky UI elements
3. **Differentiation** — What is the ONE thing a user will remember about this interface?
4. **Complexity match** — Does the aesthetic call for elaborate animation and layering, or surgical restraint? Neither is better. Execute the right one.

**Do not proceed until you have a committed answer to all four.** Vague direction produces generic output.

---

## Step 2: Typography

Typography is the single highest-leverage design decision. Choose with intention.

**Banned fonts** (never use): Inter, Roboto, Arial, Helvetica, system-ui, sans-serif as a primary font, Space Grotesk, DM Sans, Plus Jakarta Sans.

**How to choose:**
- Every design needs at least two fonts: one **display** (headlines, hero text) and one **body** (reading, UI labels).
- The display font should carry the aesthetic. The body font should recede and support readability.
- Load from Google Fonts or use @font-face. Always specify fallbacks.

**Curated font pairings by aesthetic:**

| Aesthetic | Display | Body |
|---|---|---|
| Luxury/editorial | Cormorant Garamond, Playfair Display | Jost, Lato |
| Brutalist | Bebas Neue, Anton | IBM Plex Mono, Courier New |
| Retro-futuristic | Orbitron, Exo 2 | Share Tech Mono, Rajdhani |
| Organic/natural | Lora, Libre Baskerville | Nunito, Karla |
| Playful | Righteous, Fredoka One | Quicksand, Nunito |
| Minimal/refined | Cormorant, Big Caslon | Outfit, Epilogue |
| Maximalist/expressive | Abril Fatface, Lobster | Source Sans Pro, Barlow |

Apply typographic contrast deliberately: vary size, weight, and letter-spacing. A 96px display line next to 13px body text is interesting. Everything at similar sizes is not.

---

## Step 3: Color

**Core rule**: One dominant color, one supporting neutral, one sharp accent. Three well-chosen colors outperform six timid ones.

**Banned combinations**: Purple/violet gradient on white (#6366f1 family), teal + coral "startup palette", generic blue on white, gray on white with no character.

**Color by aesthetic:**

- *Dark themes*: Use near-black (e.g. `#0a0a0a`, `#0f0e17`) not pure `#000000`. Accent with one saturated color.
- *Light themes*: Use off-white or warm paper tones (`#f5f0e8`, `#fafaf7`) not pure `#ffffff`. Avoid flat grays.
- *High contrast*: Commit to it. Black + one color (red, yellow, green) is a complete palette.
- *Muted/earthy*: Desaturated but warm. Think terracotta, sage, linen, charcoal.

Always define a CSS custom property palette at `:root` level:
```css
:root {
  --color-bg: #0f0e17;
  --color-surface: #1a1829;
  --color-text: #fffffe;
  --color-muted: #a7a9be;
  --color-accent: #ff8906;
}
```

---

## Step 4: Motion

Motion should feel intentional, not decorative.

**High-impact, low-noise approach:**
- One orchestrated entrance: staggered reveal of key elements on load using `animation-delay`
- Hover states that confirm interactivity (scale, color shift, underline draw)
- One signature motion: a detail that makes the UI feel alive (a cursor trail, a morphing shape, a number counting up)

**Avoid**: Constant looping animations, animations on every element, motion that doesn't serve a purpose.

**CSS-first for HTML artifacts.** For React, use the Motion library (`motion/react`) when available.

**Entrance pattern (use as a base):**
```css
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}
.reveal {
  animation: fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
}
.reveal:nth-child(2) { animation-delay: 0.1s; }
.reveal:nth-child(3) { animation-delay: 0.2s; }
```

---

## Step 5: Layout & Spatial Composition

Generic layouts are: hero → features → CTA. Centered everything. Equal spacing everywhere.

**Break these patterns deliberately:**
- Anchor one element to an edge or corner with no margin
- Overlap text on an image or shape without a container box
- Use a grid where columns are unequal (e.g. 2fr 5fr 1fr)
- Let one element bleed off-screen intentionally
- Use a large typographic element as a structural/decorative layer

**Spatial rhythm**: Pick a base spacing unit (e.g. 8px) and use multiples. Inconsistent spacing reads as unfinished. Generous spacing reads as confident.

---

## Step 6: Backgrounds & Atmosphere

Never leave a background as a flat solid color unless the aesthetic explicitly demands it (true brutalism, for example).

**Techniques by aesthetic:**

- *Noise texture*: Add grain with an SVG filter or a CSS background using a data URI noise pattern. Applies to almost any aesthetic.
- *Gradient mesh*: Multiple radial gradients layered with `mix-blend-mode` for depth.
- *Geometric pattern*: Repeating SVG shapes as `background-image` at low opacity.
- *Scanlines*: Repeating horizontal lines at low opacity for retro aesthetics.
- *Vignette*: Radial gradient from transparent center to dark edges for photography/editorial.

```css
/* Noise overlay example */
.noise::after {
  content: '';
  position: fixed;
  inset: 0;
  background-image: url("data:image/svg+xml,...");
  opacity: 0.04;
  pointer-events: none;
}
```

---

## What Never to Do

- Use Inter, Roboto, or Space Grotesk as the primary font
- Default to purple/violet gradients on white
- Center every element on the page
- Use equal padding/margin everywhere
- Add animations to every element
- Use card components with rounded corners and drop shadows as the primary layout pattern
- Generate a design that could belong to any other project — it must feel made for THIS one

---

## Final Check Before Delivering

Before finishing, ask:
1. Does the font choice match and amplify the aesthetic direction?
2. Is the color palette using dominant + accent logic, or is it timid and evenly distributed?
3. Is there one spatial decision that breaks from grid convention?
4. Is there one motion detail that feels surprising?
5. Would someone look at this and immediately know what it's for?

If any answer is no — fix it before delivering.