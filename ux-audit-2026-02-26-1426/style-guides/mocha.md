# Use the following style guide in the current design task

## Name of the styleguide: `webapp-01-industrialtechnical_mocha`

Use the above name in `spawn_agent` if you want to pass it to subagents.

# Industrial Technical Web Dashboard - Catppuccin Mocha Style Guide

---

## Style Summary

### Description

A dark-mode industrial dashboard built on Catppuccin Mocha surfaces (#1E1E2E, #181825) with a single warm sand accent (#F9E2AF). The design keeps the original control-panel and terminal personality through pervasive monospace typography (JetBrains Mono), numbered navigation sequences, and ALL-CAPS labeling with deliberate letter-spacing. Space Grotesk headlines provide geometric contrast. Suited for analytics platforms, developer tools, fintech dashboards, and data-intensive enterprise applications.

### Key Aesthetics

- **Industrial Monospace Terminal:** JetBrains Mono dominates all UI text, creating a cohesive code-editor aesthetic. Space Grotesk provides geometric contrast for headlines and metric values only.
- **Typography:** ALL CAPS combined with wide letter-spacing (1px) for labels, buttons, badges, and navigation. Numbered prefixes (01, 02, 03) create systematic ordering.
- **Structure:** Zero corner radius throughout. 1px borders (#313244) as the primary structural device. Left-edge accent borders (#F9E2AF) mark active states and emphasis.
- **Color:** Near-monochrome dark foundation from Catppuccin Mocha with a single warm accent (#F9E2AF) reserved for active states, CTAs, and charts. Semantic colors (green/red/blue) are used only for status communication.
- **Interactive elements:** Vertical indicator bars (3px) prefix activity items. Text-based status badges (OK, WAIT, ERR, NEW) communicate state through color-coded text.

### Tags

`industrial` - `technical` - `dark-mode` - `monospace` - `catppuccin-mocha` - `sand-accent` - `data-dashboard` - `developer` - `numbered-nav` - `enterprise`

---

## Color System

The design operates in near-total monochrome using Catppuccin Mocha's dark neutral ladder and one warm accent for priority interactions. Semantic colors appear only for state communication.

### Core Backgrounds

- #1E1E2E - Page Background (Base)
- #181825 - Sidebar, Card Background (Mantle)
- #11111B - Surface Tint (Crust)

### Text Colors

- #CDD6F4 - Text Primary
- #BAC2DE - Text Light (descriptions)
- #6C7086 - Text Secondary (labels, inactive nav)
- #585B70 - Text Tertiary (inactive numbers, dismiss icons)

### Accent Colors

- #F9E2AF - Sand Primary (active states, CTAs, charts, indicators)
- #F9E2AF26 - Sand Tint 15% (active nav background)
- #F9E2AF1A - Sand Tint 10% (banner/upgrade backgrounds)
- #F9E2AF4D - Sand Tint 30% (subtle stroke)

### Semantic Colors

- #A6E3A1 - Success (positive changes, completed)
- #F9E2AF - Warning (pending states)
- #F38BA8 - Error (negative changes, failures)
- #89B4FA - Info (new items, informational)

### Borders

- #313244 - Default Border
- #F9E2AF - Accent Border (active states, left-edge highlights)

---

## Typography

The dual-font system creates clear information hierarchy through deliberate contrast:

- **Mono vs. Geometric** - JetBrains Mono for all UI text creates terminal/developer feel; Space Grotesk provides geometric contrast for display elements only
- **Weight hierarchy** - Bold (700) for headlines and active states, Semibold (600) for navigation and labels, Medium (500) for inactive UI, Regular (400) for body text
- **Case differentiation** - ALL CAPS with letter-spacing (1px) for labels, buttons, badges, and navigation. Sentence case for body content only
- **Numbered navigation** - Items prefixed 01, 02, 03 reinforce the systematic industrial ordering

### Font Families

- **Space Grotesk** - Headlines, page titles, metric values, section headers
- **JetBrains Mono** - Everything else: navigation, labels, buttons, badges, table data, body text

### Type Scale

- **40px** - Page Title. Space Grotesk, bold, letterSpacing: -1
- **32px** - Metric Value. Space Grotesk, bold
- **18px** - Section Title. Space Grotesk, bold
- **14px** - Card Title. Space Grotesk, bold, letterSpacing: 0.5
- **14px** - Logo Text. JetBrains Mono, bold, letterSpacing: 2
- **14px** - Body. JetBrains Mono, regular
- **12px** - Navigation. JetBrains Mono, medium/semibold, letterSpacing: 1
- **11-12px** - Label, Table Header. JetBrains Mono, semibold/bold, letterSpacing: 1
- **11px** - Meta, Timestamp. JetBrains Mono, regular/semibold
- **10-12px** - Badge. JetBrains Mono, bold, letterSpacing: 1

### Font Weights

- **700** - Bold. Page titles, metric values, section titles, badges, active states
- **600** - Semibold. Navigation numbers, labels, metadata
- **500** - Medium. Inactive navigation, general UI
- **400** - Regular. Body text, descriptions, secondary content

### Letter Spacing

- **-1px** - Page titles (tight tracking for large headlines)
- **0.5px** - Card titles, activity item titles
- **1px** - Labels, navigation, badges, table headers, buttons (standard wide)
- **2px** - Logo text (extra wide for brand emphasis)

---

## Spacing System

Systematic spacing reinforces the industrial grid. Card internal padding is consistent at 20px, section gaps at 32px, and element gaps follow a strict scale. No decorative spacing; every value serves structural clarity.

### Gap Scale (between elements)

- **40px** - XXL. Content area horizontal padding
- **32px** - XL. Section separations, sidebar top section gap
- **20px** - Large. Activity section gap, table section gap, sidebar bottom
- **16px** - Medium. Card internal gaps, gallery/metrics row gap
- **12px** - Standard. Activity items, banner content, action buttons
- **8px** - Small. Chart bars, logo mark to text, nav number to text
- **4px** - Tight. Title-description stacks
- **2px** - Minimal. Navigation item vertical gap

### Padding Scale

- **[32, 40]** - Main content area (vertical, horizontal)
- **[24, 16]** - Sidebar (vertical, horizontal)
- **[20]** - Metric cards, chart section, table section, activity section
- **[16]** - Upgrade box, card content area
- **[14, 16]** - Banner
- **[10, 18]** - Primary action buttons
- **[10, 14]** - Header action buttons
- **[10, 12]** - Navigation items
- **[8, 12]** - Small outline buttons
- **[3, 6]** - Tags/badges

### Layout Pattern

- **1440px** - Screen Width (standard desktop)
- **240px** - Sidebar Width (fixed)
- **fill_container** - Content Area (flexible)
- **32px / 40px** - Content Padding (vertical / horizontal)
- **32px** - Section Gap
- **4 columns** - Metric Cards Grid, fill_container each, 16px gap
- **3 columns** - Gallery Cards Grid, fill_container each, 16px gap
- **320px** - Activity Section Width (fixed, beside chart)

---

## Corner Radius

This design system uses **zero corner radius** throughout, reinforcing industrial control-panel precision.

- **0px** - ALL elements (no rounded corners whatsoever)

---

## Icons

### Icon Style

- **Lucide** - Minimal, geometric line icons

### Icons Used

- **Navigation** - zap, chevron-down
- **Actions** - search, calendar, plus, download
- **Status** - arrow-up-right, arrow-down-right, minus
- **Navigation Arrows** - arrow-left, arrow-right, chevron-right
- **Dismiss** - x

### Icon Sizes

- **14px** - Standard (navigation, actions, arrows)
- **12px** - Small (table actions, status indicators)

### Icon Color States

- #11111B - On Sand Fill (dark for contrast)
- #CDD6F4 - Active/Primary
- #585B70 - Inactive
- #6C7086 - Muted
- Semantic - #A6E3A1, #F38BA8, #F9E2AF, #89B4FA

---

## Implementation Notes

- Keep all structural and typographic rules identical to the industrial base theme; only color tokens are changed.
- Sand accent can be used more aggressively in dark contexts, including chart highlights and active nav fills, while preserving neutral-heavy surfaces.
