---
name: web-design-guidelines
description: Review UI code for Web Interface Guidelines compliance. Use when asked to "review my UI", "check accessibility", "audit design", "review UX", "check my site against best practices", or when building new UI and want to validate it meets standards before delivering.
metadata:
  author: vercel
  version: "1.1.0"
  argument-hint: <file-or-pattern> [--scope=<category>]
---

# Web Interface Guidelines

Review files for compliance with Vercel's Web Interface Guidelines. Produces terse, actionable `file:line` findings grouped by file.

---

## Workflow

1. **Fetch fresh guidelines** from the source URL (see below). Always attempt this first.
2. **On fetch failure** — use the embedded ruleset in this file (Section: Embedded Rules). Never skip the review.
3. **Read the target files.** If no files were specified, ask the user: *"Which files or glob pattern should I review?"*
4. **Apply scope filter** if `--scope` was provided (see Scope section).
5. **Output findings** using the format in this file (not from the fetched content — the format here is authoritative).

### Guidelines Source

```
https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md
```

Fetch with WebFetch before each review. If the fetched content contains rules that differ from or extend the embedded rules below, **use the fetched rules** — they are newer. If the fetch fails for any reason (network error, timeout, 404, rate limit), fall through to the embedded rules silently — do not mention the failure to the user unless asked.

---

## Scope Control

By default, apply all rule categories. If the user passes `--scope`, apply only the listed categories:

| Flag | Categories covered |
|---|---|
| `--scope=a11y` | Accessibility, Focus States |
| `--scope=forms` | Forms |
| `--scope=perf` | Performance, Images |
| `--scope=motion` | Animation |
| `--scope=layout` | Safe Areas & Layout, Content Handling |
| `--scope=ux` | Navigation & State, Touch & Interaction, Hover & Interactive States |
| `--scope=copy` | Typography, Content & Copy |
| `--scope=i18n` | Locale & i18n |
| `--scope=theme` | Dark Mode & Theming |
| `--scope=hydration` | Hydration Safety |

Multiple scopes: `--scope=a11y,forms,perf`

---

## Output Format

Group findings by file. Use `file:line` format (VS Code clickable). One finding per line. Terse — state the issue and location only. Include a fix hint only when the fix is non-obvious.

```
## src/Button.tsx

src/Button.tsx:42  icon button missing aria-label
src/Button.tsx:18  input lacks label or aria-label
src/Button.tsx:55  animation missing prefers-reduced-motion guard
src/Button.tsx:67  transition: all → list properties explicitly

## src/Modal.tsx

src/Modal.tsx:12  missing overscroll-behavior: contain
src/Modal.tsx:34  "..." → "…" (ellipsis character)

## src/Form.tsx

✓ pass
```

**Rules for output:**
- No preamble, no summary paragraph before findings
- No explanation unless the fix is genuinely non-obvious
- Files with zero findings get `✓ pass` — always list reviewed files
- After all file findings, output a single counts line:

```
─
X issues across Y files (Z passed)
```

- If zero issues total: `✓ All clear — N files reviewed`

---

## Embedded Rules

*These rules are used when the live fetch fails. Keep in sync with the source URL.*

### Accessibility

- Icon-only buttons need `aria-label`
- Form controls need `<label>` or `aria-label`
- Interactive elements need keyboard handlers (`onKeyDown` / `onKeyUp`)
- `<button>` for actions, `<a>` / `<Link>` for navigation — never `<div onClick>`
- Images need `alt` (or `alt=""` if decorative)
- Decorative icons need `aria-hidden="true"`
- Async updates (toasts, validation) need `aria-live="polite"`
- Use semantic HTML before ARIA
- Headings hierarchical `<h1>`–`<h6>`; include skip link for main content
- `scroll-margin-top` on heading anchors

### Focus States

- Interactive elements need visible focus: `focus-visible:ring-*` or equivalent
- Never `outline-none` / `outline: none` without a focus-visible replacement
- Use `:focus-visible` over `:focus` (avoids ring on click)
- Group focus with `:focus-within` for compound controls

### Forms

- Inputs need `autocomplete` and meaningful `name`
- Use correct `type` (`email`, `tel`, `url`, `number`) and `inputmode`
- Never block paste (`onPaste` + `preventDefault`)
- Labels must be clickable (`htmlFor` or wrapping the control)
- Disable spellcheck on emails, codes, usernames (`spellCheck={false}`)
- Checkboxes/radios: label and control share one hit target — no dead zones
- Submit button stays enabled until request starts; show spinner during request
- Errors inline next to fields; focus first error on submit
- Placeholders end with `…` and show example pattern
- `autocomplete="off"` on non-auth fields to avoid password manager triggers
- Warn before navigation with unsaved changes (`beforeunload` or router guard)

### Animation

- Honor `prefers-reduced-motion` — provide reduced variant or disable
- Animate `transform` / `opacity` only (compositor-friendly)
- Never `transition: all` — list properties explicitly
- Set correct `transform-origin`
- SVG: transforms on `<g>` wrapper with `transform-box: fill-box; transform-origin: center`
- Animations must be interruptible — respond to user input mid-animation

### Typography

- `…` not `...`
- Curly quotes `"` `"` not straight `"`
- Non-breaking spaces: `10&nbsp;MB`, `⌘&nbsp;K`, brand names
- Loading states end with `…`: `"Loading…"`, `"Saving…"`
- `font-variant-numeric: tabular-nums` for number columns and comparisons
- Use `text-wrap: balance` or `text-pretty` on headings to prevent widows

### Content Handling

- Text containers handle long content: `truncate`, `line-clamp-*`, or `break-words`
- Flex children need `min-w-0` to allow text truncation
- Handle empty states — don't render broken UI for empty strings or arrays
- User-generated content: anticipate short, average, and very long inputs

### Images

- `<img>` needs explicit `width` and `height` (prevents CLS)
- Below-fold images: `loading="lazy"`
- Above-fold critical images: `priority` or `fetchpriority="high"`

### Performance

- Large lists (>50 items): virtualize (`virtua`, `content-visibility: auto`)
- No layout reads in render (`getBoundingClientRect`, `offsetHeight`, `offsetWidth`, `scrollTop`)
- Batch DOM reads/writes — avoid interleaving
- Prefer uncontrolled inputs; controlled inputs must be cheap per keystroke
- Add `<link rel="preconnect">` for CDN / asset domains
- Critical fonts: `<link rel="preload" as="font">` with `font-display: swap`

### Navigation & State

- URL reflects state — filters, tabs, pagination, expanded panels in query params
- Links use `<a>` / `<Link>` (supports Cmd/Ctrl+click, middle-click)
- Deep-link all stateful UI (if using `useState`, consider URL sync via nuqs or similar)
- Destructive actions need confirmation modal or undo window — never immediate

### Touch & Interaction

- `touch-action: manipulation` (prevents double-tap zoom delay)
- `-webkit-tap-highlight-color` set intentionally
- `overscroll-behavior: contain` in modals, drawers, and sheets
- During drag: disable text selection, `inert` on dragged elements
- `autoFocus` sparingly — desktop only, single primary input; avoid on mobile

### Safe Areas & Layout

- Full-bleed layouts need `env(safe-area-inset-*)` for notched devices
- Avoid unwanted scrollbars: `overflow-x-hidden` on containers
- Flex / grid over JS measurement for layout

### Dark Mode & Theming

- `color-scheme: dark` on `<html>` for dark themes (fixes scrollbar and input rendering)
- `<meta name="theme-color">` matches page background
- Native `<select>`: explicit `background-color` and `color` (fixes Windows dark mode)

### Locale & i18n

- Dates/times: use `Intl.DateTimeFormat` — not hardcoded formats
- Numbers/currency: use `Intl.NumberFormat` — not hardcoded formats
- Detect language via `Accept-Language` / `navigator.languages`, not IP

### Hydration Safety

- Inputs with `value` need `onChange` (or use `defaultValue` for uncontrolled)
- Date/time rendering: guard against hydration mismatch (server vs client timezone)
- `suppressHydrationWarning` only where truly unavoidable

### Hover & Interactive States

- Buttons and links need `hover:` state (visual feedback)
- Interactive states increase contrast: hover/active/focus more prominent than rest

### Content & Copy

- Active voice: "Install the CLI" not "The CLI will be installed"
- Title Case for headings and buttons (Chicago style)
- Numerals for counts: "8 deployments" not "eight"
- Specific button labels: "Save API Key" not "Continue"
- Error messages include fix or next step — not just the problem
- Second person; avoid first person
- `&` over "and" where space-constrained

---

## Anti-Patterns (Always Flag)

These are automatic failures regardless of context:

| Anti-pattern | Why |
|---|---|
| `user-scalable=no` or `maximum-scale=1` | Disables zoom — accessibility violation |
| `onPaste` + `preventDefault` | Blocks paste — accessibility violation |
| `transition: all` | Causes jank and fights with reduced-motion |
| `outline-none` without `:focus-visible` replacement | Breaks keyboard navigation |
| `<div onClick>` or `<span onClick>` for actions | Must be `<button>` |
| Inline `onClick` for navigation without `<a>` | Breaks Cmd+click, middle-click |
| `<img>` without `width` and `height` | Causes layout shift (CLS) |
| `.map()` on arrays >50 items without virtualization | Performance |
| Form inputs without labels | Accessibility violation |
| Icon buttons without `aria-label` | Accessibility violation |
| Hardcoded date/number formats | Breaks for non-English locales |
| `autoFocus` without justification | Disruptive on mobile |

---

## Example Invocations

```
# Review a single file
review src/components/Button.tsx

# Review all components
review src/components/**/*.tsx

# Accessibility audit only
review src/ --scope=a11y

# Forms + accessibility
review src/forms/ --scope=a11y,forms

# Full audit, ask for files
review
```