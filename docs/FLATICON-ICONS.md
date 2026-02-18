# Flaticon Uicons – Icon usage

This project uses **@flaticon/flaticon-uicons** for all interface icons.

## Installation

Already installed:

```bash
npm i @flaticon/flaticon-uicons --legacy-peer-deps
```

The Flaticon CSS is imported once in `app/globals.css`:

```css
@import "@flaticon/flaticon-uicons/css/all/all.css";
```

## Usage in React

### Option 1: `FlaticonIcon` component (recommended)

Use the shared component for consistent sizing and accessibility:

```tsx
import { FlaticonIcon } from "@/components/ui/flaticon-icon"

// Solid rounded (default) – good for nav and buttons
<FlaticonIcon name="home" className="w-5 h-5" />
<FlaticonIcon name="user" className="w-5 h-5" />
<FlaticonIcon name="search" className="w-5 h-5" />
<FlaticonIcon name="settings" className="w-5 h-5" />
<FlaticonIcon name="add" className="w-5 h-5" />
<FlaticonIcon name="globe" className="w-5 h-5" />
<FlaticonIcon name="arrow-right" className="w-4 h-4" />
<FlaticonIcon name="angle-left" className="w-4 h-4" />
<FlaticonIcon name="angle-right" className="w-4 h-4" />

// Different style: regular rounded
<FlaticonIcon name="home" style="fi-rr" className="w-5 h-5" />

// With aria-label for accessibility
<FlaticonIcon name="close" aria-label="Close" className="w-5 h-5" />
```

### Option 2: Raw class names

You can also use the icon font classes directly on an `<i>` or `<span>`:

```tsx
<i className="fi fi-sr-home w-5 h-5" aria-hidden />
<i className="fi fi-br-arrow-right w-4 h-4" />
```

## Icon styles (prefixes)

| Weight   | Corner   | Prefix     | Example class      |
|----------|----------|------------|--------------------|
| Regular  | Rounded  | `fi-rr`    | `fi fi-rr-user`    |
| Bold     | Rounded  | `fi-br`    | `fi fi-br-arrow-right` |
| Solid    | Rounded  | `fi-sr`    | `fi fi-sr-home`    |
| Regular  | Straight | `fi-rs`    | `fi fi-rs-user`    |
| Bold     | Straight | `fi-bs`    | `fi fi-bs-arrow-right` |
| Solid    | Straight | `fi-ss`    | `fi fi-ss-home`    |
| Thin     | Rounded  | `fi-tr`    | `fi fi-tr-circle-user` |
| Thin     | Straight | `fi-ts`    | `fi fi-ts-circle-user` |
| Brands   | —        | `fi-brands`| `fi fi-brands-facebook` |

We use **Solid Rounded (`fi-sr`)** by default for nav and buttons.

## Icon names

Icon names are **kebab-case**. Browse the full set at [Flaticon Uicons](https://www.flaticon.com/uicons).

Common mappings (Lucide → Flaticon name):

| Lucide (old)   | Flaticon name   |
|----------------|------------------|
| Home           | `home`           |
| User           | `user`           |
| Search         | `search`         |
| Settings       | `settings`       |
| Plus           | `add`            |
| Globe          | `globe`          |
| BookOpen       | `book`           |
| ListMusic      | `music` or `album` |
| LogOut         | `sign-out` or `logout` |
| ChevronLeft    | `angle-left` or `arrow-left` |
| ChevronRight   | `angle-right` or `arrow-right` |
| Sparkles       | `sparkles` or `star` |
| Crown          | `crown`          |
| Heart          | `heart`          |
| Bookmark       | `bookmark`       |
| X              | `cross` or `multiply` |
| Send           | `paper-plane` or `send` |
| Briefcase      | `briefcase`      |
| Calendar       | `calendar`       |
| Target         | `target` or `crosshairs` |
| Mail           | `envelope`       |
| Lock           | `lock`           |
| Eye            | `eye`            |
| MoreHorizontal | `ellipsis` or `dots-three` |
| EyeOff         | `eye-off`        |
| AlertCircle    | `exclamation`   |
| PanelLeft      | `menu`          |
| UserPlus       | `user-plus`     |
| Bell           | `bell`          |
| Inbox          | `inbox`         |
| Hash           | `hashtag`       |

If an icon doesn’t appear, check [Flaticon Uicons](https://www.flaticon.com/uicons) for the exact name.

## Importing only one style (smaller bundle)

To load a single style instead of all icons:

```css
@import "@flaticon/flaticon-uicons/css/solid/rounded.css";
```

Then use only `fi-sr-*` classes. See the package’s `css/` folder for other options.

## Attribution

Flaticon’s license requires attribution. Add this in your footer or credits:

```html
Uicons by <a href="https://www.flaticon.com/uicons">Flaticon</a>
```

## Package docs

- [npm package](https://www.npmjs.com/package/@flaticon/flaticon-uicons)
- [Flaticon Uicons](https://www.flaticon.com/uicons)
- [Get started](https://www.flaticon.com/uicons/get-started)
